import type { REST } from '@discordjs/rest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from '@sapphire/pieces';
import type { Logger } from 'pino';
import { toJSONSchema, z } from 'zod';
import type { Config } from './config.js';
import type { Tool } from './pieces/Tool.js';
import { ToolStore } from './stores/ToolStore.js';
import { messagesSend } from './tools/messages/send.js';

export interface BuildServerDeps {
  rest: REST;
  logger: Logger;
  config: Config;
}

export interface BuildServerResult {
  server: Server;
  registeredTools: string[];
}

export async function buildServer(deps: BuildServerDeps): Promise<BuildServerResult> {
  // Wire container slots (declaration-merged singleton).
  container.rest = deps.rest;
  container.logger = deps.logger;
  container.config = deps.config;

  // Initialize stores.
  const toolStore = new ToolStore();
  // v0: register the one hot-path tool inline. Plan 1+ replaces this with auto-discovery.
  // messagesSend is the concrete subclass returned by defineTool(); cast away
  // the abstract typing so TypeScript allows direct instantiation here.
  const MessagesSendCtor = messagesSend as unknown as new (
    ...args: ConstructorParameters<typeof Tool>
  ) => Tool;
  toolStore.set(
    'messages_send',
    new MessagesSendCtor(
      { name: 'messages_send', path: 'inline', root: 'inline', store: toolStore as never },
      { name: 'messages_send', enabled: true },
    ),
  );

  const registeredTools: string[] = [...toolStore.keys()];

  // Build MCP server.
  const server = new Server(
    { name: 'discord-mcp', version: '0.0.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Discord MCP server. v0 skeleton — only messages_send available. ' +
        'Use guild ID, channel ID, message ID where required (17-20 digit Discord snowflakes).',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: McpTool[] = [];
    for (const tool of toolStore.values()) {
      const inputSchema = z.object(tool.inputSchema);
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: toJSONSchema(inputSchema, {
          target: 'draft-2020-12',
        }) as McpTool['inputSchema'],
        annotations: tool.annotations,
      });
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const tool = toolStore.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool '${req.params.name}' not found.` }],
      };
    }
    const inputSchema = z.object(tool.inputSchema);
    const parsed = inputSchema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              `**Input Error**\n\n` +
              parsed.error.issues.map((i) => `- \`${i.path.join('.')}\`: ${i.message}`).join('\n'),
          },
        ],
        structuredContent: { code: 'VALIDATION_FAILED', issues: parsed.error.issues },
      };
    }
    try {
      const result = await tool.run(parsed.data, { signal: extra.signal });
      // result is already a CallToolResult shape from dualResult().
      return result as never;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      deps.logger.error({ err: e, tool: tool.name }, 'tool execution failed');
      return {
        isError: true,
        content: [{ type: 'text', text: `**Internal Error in \`${tool.name}\`**\n\n${msg}` }],
        structuredContent: { code: 'INTERNAL_ERROR', message: msg },
      };
    }
  });

  return { server, registeredTools };
}
