/**
 * Claude Code (Anthropic CLI) MCP server snippet generator.
 *
 * Claude Code uses the same `mcpServers` JSON schema as Claude Desktop
 * but stores it in different locations and exposes a `claude mcp add`
 * subcommand for managed configuration. We emit the JSON snippet for
 * users who prefer manual editing and document both options.
 *
 * Path order matches Anthropic CLI's lookup: project-local takes
 * priority over user-level. We document the user-level path here since
 * `init` is typically run once per machine.
 */
import { renderMcpServersJson } from './_shared.js';
import type { ClientGenerator, Snippet, SnippetConfig } from './types.js';

const CONFIG_PATH = [
  'User-level (preferred):  ~/.claude.json',
  'Project-level:           <project>/.mcp.json',
  'Modern CLI form:         claude mcp add discord-mcp -- <command> [args...]',
].join('\n');

const INSTRUCTIONS =
  'Easiest: `claude mcp add discord-mcp -- <command> [args...]`. Manual: merge into the `mcpServers` object in ~/.claude.json (or the project-level .mcp.json).';

export const claudeCodeGenerator: ClientGenerator = {
  id: 'claude-code',
  displayName: 'Claude Code',
  generate(cfg: SnippetConfig): Snippet {
    return {
      format: 'json',
      content: renderMcpServersJson(cfg),
      configFilePath: CONFIG_PATH,
      instructions: INSTRUCTIONS,
    };
  },
};
