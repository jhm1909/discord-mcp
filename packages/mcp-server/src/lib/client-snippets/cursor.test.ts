import { describe, expect, it } from 'vitest';
import { cursorGenerator } from './cursor.js';
import type { SnippetConfig } from './types.js';

const baseConfig: SnippetConfig = {
  serverPath: '/usr/local/bin/discord-mcp',
  discordToken: 'Bot xyz',
};

interface ParsedDoc {
  mcpServers: {
    'discord-mcp': {
      command: string;
      args: string[];
      env: Record<string, string>;
    };
  };
}

function parseSnippet(content: string): ParsedDoc {
  return JSON.parse(content) as ParsedDoc;
}

describe('cursorGenerator', () => {
  it('exposes id and displayName', () => {
    expect(cursorGenerator.id).toBe('cursor');
    expect(cursorGenerator.displayName).toBe('Cursor');
  });

  it('generates parseable JSON', () => {
    const snippet = cursorGenerator.generate(baseConfig);
    expect(() => parseSnippet(snippet.content)).not.toThrow();
  });

  it('places token in env.DISCORD_TOKEN', () => {
    const snippet = cursorGenerator.generate(baseConfig);
    const env = parseSnippet(snippet.content).mcpServers['discord-mcp'].env;
    expect(env.DISCORD_TOKEN).toBe('Bot xyz');
  });

  it('places serverPath in command and yields empty args without serverArgs', () => {
    const snippet = cursorGenerator.generate(baseConfig);
    const parsed = parseSnippet(snippet.content);
    expect(parsed.mcpServers['discord-mcp'].command).toBe('/usr/local/bin/discord-mcp');
    expect(parsed.mcpServers['discord-mcp'].args).toEqual([]);
  });

  it('adds --gateway when gateway: true (only arg in this scenario)', () => {
    const snippet = cursorGenerator.generate({ ...baseConfig, gateway: true });
    const args = parseSnippet(snippet.content).mcpServers['discord-mcp'].args;
    expect(args).toEqual(['--gateway']);
  });

  it('configFilePath mentions both global and per-project paths', () => {
    const snippet = cursorGenerator.generate(baseConfig);
    expect(snippet.configFilePath).toContain('.cursor/mcp.json');
    expect(snippet.configFilePath.toLowerCase()).toContain('global');
    expect(snippet.configFilePath.toLowerCase()).toContain('per-project');
  });

  it('instructions reference Cursor and restart', () => {
    const snippet = cursorGenerator.generate(baseConfig);
    expect(snippet.instructions).toMatch(/Cursor/i);
    expect(snippet.instructions.toLowerCase()).toContain('restart');
  });
});
