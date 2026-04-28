import { randomUUID } from 'node:crypto';
import type { REST } from '@discordjs/rest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from '@sapphire/pieces';
import type { Logger } from 'pino';
import { z } from 'zod';
import { runWithCtx } from './als/context.js';
import type { Config } from './config.js';
import { formatErrorForUser } from './errors/format.js';
import { SubscriptionRegistry } from './gateway/subscription_registry.js';
import { compose, type MiddlewareContext, type ToolMiddleware } from './middleware/compose.js';
import { preconditionMiddleware } from './middleware/precondition.js';
import { validateMiddleware } from './middleware/validate.js';
import type { Tool } from './pieces/Tool.js';
import { CategoryEnabled } from './preconditions/CategoryEnabled.js';
import { ConfirmRequired } from './preconditions/ConfirmRequired.js';
import { listV2Resources, readV2Resource } from './resources/components-v2.js';
import { PreconditionStore } from './stores/PreconditionStore.js';
import { ToolStore } from './stores/ToolStore.js';
import AppEmojisCreate from './tools/app_emojis/create.js';
import AppEmojisDelete from './tools/app_emojis/delete.js';
import AppEmojisGet from './tools/app_emojis/get.js';
import AppEmojisList from './tools/app_emojis/list.js';
import AppEmojisModify from './tools/app_emojis/modify.js';
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
import EmojisCreate from './tools/emojis/create.js';
import EmojisDelete from './tools/emojis/delete.js';
import EmojisGet from './tools/emojis/get.js';
import EmojisListGuild from './tools/emojis/list_guild.js';
import EmojisModify from './tools/emojis/modify.js';
import EventsList from './tools/events/list.js';
import GuildGet from './tools/guild/get.js';
import IntelligenceClassifyMessages from './tools/intelligence/classify_messages.js';
import IntelligenceDraftResponse from './tools/intelligence/draft_response.js';
import IntelligenceExtractEntities from './tools/intelligence/extract_entities.js';
import IntelligenceModerateContent from './tools/intelligence/moderate_content.js';
import IntelligenceSummarizeChannel from './tools/intelligence/summarize_channel.js';
import MembersGet from './tools/members/get.js';
import MembersSearch from './tools/members/search.js';
import MessagesBulkDelete from './tools/messages/bulk_delete.js';
import MessagesCreateThread from './tools/messages/create_thread.js';
import MessagesCrosspost from './tools/messages/crosspost.js';
import MessagesDelete from './tools/messages/delete.js';
import MessagesEdit from './tools/messages/edit.js';
import MessagesGet from './tools/messages/get.js';
import MessagesListPins from './tools/messages/list_pins.js';
import MessagesPin from './tools/messages/pin.js';
import MessagesRead from './tools/messages/read.js';
import MessagesSearchRecent from './tools/messages/search_recent.js';
import MessagesSend from './tools/messages/send.js';
import MessagesUnpin from './tools/messages/unpin.js';
import McpPipeline from './tools/meta/pipeline.js';
import ReactionsCreate from './tools/reactions/create.js';
import ReactionsDeleteAll from './tools/reactions/delete_all.js';
import ReactionsDeleteOwn from './tools/reactions/delete_own.js';
import ReactionsDeleteUser from './tools/reactions/delete_user.js';
import ReactionsList from './tools/reactions/list.js';
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
  notifyResource: (uri: string) => Promise<void>;
  subscriptions: SubscriptionRegistry;
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
    name: 'messages_get',
    piece: MessagesGet as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_crosspost',
    piece: MessagesCrosspost as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_bulk_delete',
    piece: MessagesBulkDelete as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_pin',
    piece: MessagesPin as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_unpin',
    piece: MessagesUnpin as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_list_pins',
    piece: MessagesListPins as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_create_thread',
    piece: MessagesCreateThread as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'messages_search_recent',
    piece: MessagesSearchRecent as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'reactions_create',
    piece: ReactionsCreate as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'reactions_delete_own',
    piece: ReactionsDeleteOwn as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'reactions_delete_user',
    piece: ReactionsDeleteUser as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'reactions_list',
    piece: ReactionsList as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'reactions_delete_all',
    piece: ReactionsDeleteAll as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'emojis_list_guild',
    piece: EmojisListGuild as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'emojis_get',
    piece: EmojisGet as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'emojis_create',
    piece: EmojisCreate as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'emojis_modify',
    piece: EmojisModify as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'emojis_delete',
    piece: EmojisDelete as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'app_emojis_list',
    piece: AppEmojisList as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'app_emojis_get',
    piece: AppEmojisGet as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'app_emojis_create',
    piece: AppEmojisCreate as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'app_emojis_modify',
    piece: AppEmojisModify as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'app_emojis_delete',
    piece: AppEmojisDelete as unknown as ConcreteTool,
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
  await toolStore.loadPiece({
    name: 'mcp_pipeline',
    piece: McpPipeline as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'intelligence_summarize_channel',
    piece: IntelligenceSummarizeChannel as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'intelligence_classify_messages',
    piece: IntelligenceClassifyMessages as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'intelligence_draft_response',
    piece: IntelligenceDraftResponse as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'intelligence_moderate_content',
    piece: IntelligenceModerateContent as unknown as ConcreteTool,
  });
  await toolStore.loadPiece({
    name: 'intelligence_extract_entities',
    piece: IntelligenceExtractEntities as unknown as ConcreteTool,
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
      capabilities: { tools: {}, resources: { subscribe: true } },
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

  // Lazy snapshot of client capabilities (populated after MCP initialize completes).
  let cachedClientCaps: {
    sampling?: object;
    elicitation?: object;
    experimental?: Record<string, unknown>;
  } | null = null;
  const getClientCaps = (): typeof cachedClientCaps => {
    if (cachedClientCaps !== null) return cachedClientCaps;
    const fn = (server as unknown as { getClientCapabilities?: () => unknown })
      .getClientCapabilities;
    if (typeof fn !== 'function') return null;
    const result = fn.call(server) as typeof cachedClientCaps;
    if (result !== null && result !== undefined) {
      cachedClientCaps = result;
    }
    return result;
  };

  // Sampling wrapper — calls server.createMessage(params) per MCP spec.
  interface SamplingMessage {
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }
  interface SamplingParams {
    messages: SamplingMessage[];
    maxTokens: number;
    modelPreferences?: {
      intelligencePriority?: number;
      speedPriority?: number;
      costPriority?: number;
      hints?: Array<{ name: string }>;
    };
    systemPrompt?: string;
  }
  interface SamplingResult {
    role: 'assistant';
    content: { type: 'text'; text: string };
    model?: string;
    stopReason?: string;
  }

  const requestSampling = async (params: SamplingParams): Promise<SamplingResult> => {
    const fn = (
      server as unknown as { createMessage?: (p: SamplingParams) => Promise<SamplingResult> }
    ).createMessage;
    if (typeof fn !== 'function') {
      throw new Error('SDK does not expose createMessage — sampling unavailable');
    }
    return fn.call(server, params);
  };

  const invokeTool = async (
    toolName: string,
    args: unknown,
    signal: AbortSignal,
  ): Promise<CallToolResult> => {
    const tool = toolStore.get(toolName);
    if (tool === undefined) {
      return formatErrorForUser(new Error(`Tool '${toolName}' not found.`), {
        toolName,
        transport: 'stdio',
      });
    }
    const middlewareCtx: MiddlewareContext<unknown> = {
      tool: { name: tool.name, category: tool.category, idempotent: tool.idempotent },
      args: args ?? {},
      meta: new Map<string, unknown>([
        ['toolPiece', tool],
        ['toolPreconditions', tool.preconditions],
      ]),
    };
    const dispatch = compose(middlewares, async (c) => {
      const samplingSupported = getClientCaps()?.sampling !== undefined;
      return tool.run(c.args, {
        signal,
        invoke: invokeTool,
        requestSampling,
        samplingSupported,
      } as never);
    });
    try {
      return (await dispatch(middlewareCtx)) as CallToolResult;
    } catch (e) {
      deps.logger.warn({ err: e, tool: tool.name }, 'tool error');
      return formatErrorForUser(e, { toolName: tool.name, transport: 'stdio' });
    }
  };

  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const requestId = randomUUID();
    const requestCtx = {
      requestId,
      toolName: req.params.name,
      transport: 'stdio' as const,
      signal: extra.signal,
    };
    return runWithCtx(requestCtx, async () =>
      invokeTool(req.params.name, req.params.arguments, extra.signal),
    );
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

  const subscriptions = new SubscriptionRegistry();

  server.setRequestHandler(SubscribeRequestSchema, async (req) => {
    subscriptions.subscribe(req.params.uri);
    return {};
  });

  server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
    subscriptions.unsubscribe(req.params.uri);
    return {};
  });

  const notifyResource = async (uri: string): Promise<void> => {
    if (subscriptions.has(uri)) {
      await server.sendResourceUpdated({ uri });
    }
  };

  return { server, registeredTools, registeredPreconditions, notifyResource, subscriptions };
}
