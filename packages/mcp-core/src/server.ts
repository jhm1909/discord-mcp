import { randomUUID } from 'node:crypto';
import type { REST } from '@discordjs/rest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from '@sapphire/pieces';
import type { Logger } from 'pino';
import { z } from 'zod';
import { runWithCtx } from './als/context.js';
import type { Config } from './config.js';
import { formatErrorForUser } from './errors/format.js';
import { compose, type MiddlewareContext, type ToolMiddleware } from './middleware/compose.js';
import { preconditionMiddleware } from './middleware/precondition.js';
import { validateMiddleware } from './middleware/validate.js';
import type { Tool } from './pieces/Tool.js';
import { CategoryEnabled } from './preconditions/CategoryEnabled.js';
import { ConfirmRequired } from './preconditions/ConfirmRequired.js';
import { PreconditionStore } from './stores/PreconditionStore.js';
import { ToolStore } from './stores/ToolStore.js';
import MessagesSend from './tools/messages/send.js';
import MessagesRead from './tools/messages/read.js';
import ChannelsList from './tools/channels/list.js';
import ChannelsGet from './tools/channels/get.js';
import MembersGet from './tools/members/get.js';
import MembersSearch from './tools/members/search.js';
import RolesList from './tools/roles/list.js';
import GuildGet from './tools/guild/get.js';
import AuditLogGet from './tools/audit_log/get.js';
import WebhooksListChannel from './tools/webhooks/list_channel.js';

export interface BuildServerDeps {
  rest: REST;
  logger: Logger;
  config: Config;
}

export interface BuildServerResult {
  server: Server;
  registeredTools: string[];
  registeredPreconditions: string[];
}

export async function buildServer(deps: BuildServerDeps): Promise<BuildServerResult> {
  container.rest = deps.rest;
  container.logger = deps.logger;
  container.config = deps.config;

  // --- Stores ---
  const toolStore = new ToolStore();
  const preconditionStore = new PreconditionStore();

  // defineTool returns `typeof Tool` (abstract) — cast to concrete for Sapphire's loadPiece API.
  type ConcreteTool = new (...args: ConstructorParameters<typeof Tool>) => Tool;
  await toolStore.loadPiece({ name: 'messages_send', piece: MessagesSend as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'messages_read', piece: MessagesRead as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'channels_list', piece: ChannelsList as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'channels_get', piece: ChannelsGet as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'members_get', piece: MembersGet as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'members_search', piece: MembersSearch as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'roles_list', piece: RolesList as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'guild_get', piece: GuildGet as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'audit_log_get', piece: AuditLogGet as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'webhooks_list_channel', piece: WebhooksListChannel as unknown as ConcreteTool });
  await toolStore.loadAll();

  preconditionStore.set(
    'category_enabled',
    new CategoryEnabled(
      { name: 'category_enabled', path: 'inline', root: 'inline', store: null as never },
      { name: 'category_enabled', enabled: true },
    ),
  );
  preconditionStore.set(
    'confirm_required',
    new ConfirmRequired(
      { name: 'confirm_required', path: 'inline', root: 'inline', store: null as never },
      { name: 'confirm_required', enabled: true },
    ),
  );

  const registeredTools = [...toolStore.keys()];
  const registeredPreconditions = [...preconditionStore.keys()];

  // --- Middleware chain (outer → inner) ---
  const middlewares: ToolMiddleware[] = [
    validateMiddleware(),
    preconditionMiddleware(preconditionStore),
  ];

  // --- MCP server ---
  const server = new Server(
    { name: 'discord-mcp', version: '0.0.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Discord MCP server. v0/Plan-1 — only messages_send available. ' +
        'Errors return structured CallToolResult with code/retriable/recovery_hint fields. ' +
        'Snowflake IDs are 17-20 digits.',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: McpTool[] = [];
    for (const tool of toolStore.values()) {
      const inputSchema = z.object(tool.inputSchema);
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: z.toJSONSchema(inputSchema, {
          target: 'draft-2020-12',
        }) as McpTool['inputSchema'],
        annotations: tool.annotations,
      });
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const tool = toolStore.get(req.params.name);
    if (tool === undefined) {
      return formatErrorForUser(new Error(`Tool '${req.params.name}' not found.`), {
        toolName: req.params.name,
        transport: 'stdio',
      });
    }

    const requestId = randomUUID();
    const requestCtx = {
      requestId,
      toolName: tool.name,
      transport: 'stdio' as const,
      signal: extra.signal,
    };

    const middlewareCtx: MiddlewareContext<unknown> = {
      tool: { name: tool.name, category: tool.category, idempotent: tool.idempotent },
      args: req.params.arguments ?? {},
      meta: new Map<string, unknown>([
        ['toolPiece', tool],
        ['toolPreconditions', tool.preconditions],
      ]),
    };

    const dispatch = compose(middlewares, async (c) => {
      return tool.run(c.args, { signal: extra.signal });
    });

    try {
      return (await runWithCtx(requestCtx, async () => dispatch(middlewareCtx))) as never;
    } catch (e) {
      deps.logger.warn({ err: e, tool: tool.name, requestId }, 'tool error');
      return formatErrorForUser(e, { toolName: tool.name, transport: 'stdio' });
    }
  });

  return { server, registeredTools, registeredPreconditions };
}
