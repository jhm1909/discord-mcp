import { describe, expect, it } from 'vitest';
import { genericGenerator } from './generic.js';
import type { SnippetConfig } from './types.js';

const baseConfig: SnippetConfig = {
  serverPath: 'discord-mcp',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: this IS the literal placeholder syntax used by MCP clients
  discordToken: '${env:DISCORD_TOKEN}',
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

describe('genericGenerator', () => {
  it('exposes id and displayName', () => {
    expect(genericGenerator.id).toBe('generic');
    expect(genericGenerator.displayName).toBe('Generic MCP client');
  });

  it('generates parseable JSON', () => {
    const snippet = genericGenerator.generate(baseConfig);
    expect(() => parseSnippet(snippet.content)).not.toThrow();
  });

  it('places token in env.DISCORD_TOKEN', () => {
    const snippet = genericGenerator.generate(baseConfig);
    const env = parseSnippet(snippet.content).mcpServers['discord-mcp'].env;
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal placeholder, not JS interpolation
    expect(env.DISCORD_TOKEN).toBe('${env:DISCORD_TOKEN}');
  });

  it('places serverPath in command', () => {
    const snippet = genericGenerator.generate(baseConfig);
    const parsed = parseSnippet(snippet.content);
    expect(parsed.mcpServers['discord-mcp'].command).toBe('discord-mcp');
  });

  it('appends --gateway when gateway: true', () => {
    const snippet = genericGenerator.generate({ ...baseConfig, gateway: true });
    const args = parseSnippet(snippet.content).mcpServers['discord-mcp'].args;
    expect(args).toContain('--gateway');
  });

  it('configFilePath is non-empty (no specific path)', () => {
    const snippet = genericGenerator.generate(baseConfig);
    expect(snippet.configFilePath.length).toBeGreaterThan(0);
  });

  it('instructions reference standard MCP server config', () => {
    const snippet = genericGenerator.generate(baseConfig);
    expect(snippet.instructions.toLowerCase()).toContain('mcp');
  });
});
