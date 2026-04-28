import { randomUUID } from 'node:crypto';
import type { REST } from '@discordjs/rest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
  ReadResourceRequestSchema,
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
import { listV2Resources, readV2Resource } from './resources/components-v2.js';
import { PreconditionStore } from './stores/PreconditionStore.js';
import { ToolStore } from './stores/ToolStore.js';
import AuditLogGet from './tools/audit_log/get.js';
import ChannelsGet from './tools/channels/get.js';
import ChannelsList from './tools/channels/list.js';
import CommandsListGuild from './tools/commands/list_guild.js';
import ComponentsV2BuildContainer from './tools/components-v2/build_container.js';
import ComponentsV2BuildMediaGallery from './tools/components-v2/build_media_gallery.js';
import ComponentsV2BuildSection from './tools/components-v2/build_section.js';
import ComponentsV2Edit from './tools/components-v2/edit.js';
import ComponentsV2PreviewTool from './tools/components-v2/preview-tool.js';
import ComponentsV2Send from './tools/components-v2/send.js';
import ComponentsV2SendFromTemplate from './tools/components-v2/send-from-template.js';
import ComponentsV2Validate from './tools/components-v2/validate.js';
import EventsList from './tools/events/list.js';
import GuildGet from './tools/guild/get.js';
import MembersGet from './tools/members/get.js';
import MembersSearch from './tools/members/search.js';
import MessagesDelete from './tools/messages/delete.js';
import MessagesEdit from './tools/messages/edit.js';
import MessagesRead from './tools/messages/read.js';
import MessagesSend from './tools/messages/send.js';
import RolesList from './tools/roles/list.js';
import UsersGetCurrent from './tools/users/get_current.js';
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
  await toolStore.loadPiece({
    name: 'messages_send',
    piece: MessagesSend as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_read',
    piece: MessagesRead as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_edit',
    piece: MessagesEdit as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_delete',
    piece: MessagesDelete as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'channels_list',
    piece: ChannelsList as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'channels_get',
    piece: ChannelsGet as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({ name: 'members_get', piece: MembersGet as unknown as ConcreteTool });
  await toolStore.loadPiece({
    name: 'members_search',
    piece: MembersSearch as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({ name: 'roles_list', piece: RolesList as unknown as ConcreteTool });
  await toolStore.loadPiece({ name: 'guild_get', piece: GuildGet as unknown as ConcreteTool });
  await toolStore.loadPiece({
    name: 'audit_log_get',
    piece: AuditLogGet as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'webhooks_list_channel',
    piece: WebhooksListChannel as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({ name: 'events_list', piece: EventsList as unknown as ConcreteTool });
  await toolStore.loadPiece({
    name: 'commands_list_guild',
    piece: CommandsListGuild as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'users_get_current',
    piece: UsersGetCurrent as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_build_container',
    piece: ComponentsV2BuildContainer as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_build_section',
    piece: ComponentsV2BuildSection as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_build_media_gallery',
    piece: ComponentsV2BuildMediaGallery as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_validate',
    piece: ComponentsV2Validate as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_preview',
    piece: ComponentsV2PreviewTool as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_send',
    piece: ComponentsV2Send as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_edit',
    piece: ComponentsV2Edit as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'components_v2_send_from_template',
    piece: ComponentsV2SendFromTemplate as unknown as ConcreteTool,
  });
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
      capabilities: { tools: {}, resources: {} },
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

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await listV2Resources();
    return { resources: resources.map((r) => ({ ...r })) };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const content = await readV2Resource(req.params.uri);
    if (content === null) {
      throw new Error(`Resource not found: ${req.params.uri}`);
    }
    return {
      contents: [{ uri: content.uri, mimeType: content.mimeType, text: content.text }],
    };
  });

  return { server, registeredTools, registeredPreconditions };
}
