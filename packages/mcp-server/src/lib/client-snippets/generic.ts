/**
 * Generic MCP client snippet generator.
 *
 * Catch-all for clients that aren't first-class supported here but
 * implement the standard MCP server config schema. We emit the same
 * JSON shape with no client-specific path and direct the user to their
 * client's docs for placement.
 */
import { renderMcpServersJson } from './_shared.js';
import type { ClientGenerator, Snippet, SnippetConfig } from './types.js';

const CONFIG_PATH = '(check your MCP client docs for the config file location)';

const INSTRUCTIONS =
  "This is the standard MCP server config block. Place it under your client's `mcpServers` object as documented by the client.";

export const genericGenerator: ClientGenerator = {
  id: 'generic',
  displayName: 'Generic MCP client',
  generate(cfg: SnippetConfig): Snippet {
    return {
      format: 'json',
      content: renderMcpServersJson(cfg),
      configFilePath: CONFIG_PATH,
      instructions: INSTRUCTIONS,
    };
  },
};
