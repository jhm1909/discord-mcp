/**
 * Cursor MCP server snippet generator.
 *
 * Cursor adopted the standard `mcpServers` schema. Two scopes are
 * supported: global (`~/.cursor/mcp.json`) and per-project
 * (`<project>/.cursor/mcp.json`). The schema is identical, only the
 * file location differs. Restart Cursor after editing.
 */
import { renderMcpServersJson } from './_shared.js';
import type { ClientGenerator, Snippet, SnippetConfig } from './types.js';

const CONFIG_PATH = [
  'Global:           ~/.cursor/mcp.json',
  'Per-project:      <project>/.cursor/mcp.json',
].join('\n');

const INSTRUCTIONS =
  'Place under `~/.cursor/mcp.json` for global access, or `.cursor/mcp.json` in your project root for per-project. Restart Cursor for changes to take effect.';

export const cursorGenerator: ClientGenerator = {
  id: 'cursor',
  displayName: 'Cursor',
  generate(cfg: SnippetConfig): Snippet {
    return {
      format: 'json',
      content: renderMcpServersJson(cfg),
      configFilePath: CONFIG_PATH,
      instructions: INSTRUCTIONS,
    };
  },
};
