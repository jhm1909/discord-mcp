import { describe, expect, it } from 'vitest';
import { claudeDesktopGenerator } from './claude-desktop.js';
import type { SnippetConfig } from './types.js';

const baseConfig: SnippetConfig = {
  serverPath: '/usr/local/bin/node',
  serverArgs: ['/abs/path/to/cli.js'],
  discordToken: 'Bot abc123',
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

describe('claudeDesktopGenerator', () => {
  it('exposes id and displayName', () => {
    expect(claudeDesktopGenerator.id).toBe('claude-desktop');
    expect(claudeDesktopGenerator.displayName).toBe('Claude Desktop');
  });

  it('generates parseable JSON', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    expect(snippet.format).toBe('json');
    expect(() => parseSnippet(snippet.content)).not.toThrow();
  });

  it('places token in env.DISCORD_TOKEN', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    const parsed = parseSnippet(snippet.content);
    expect(parsed.mcpServers['discord-mcp'].env.DISCORD_TOKEN).toBe('Bot abc123');
  });

  it('places serverPath in command and serverArgs in args', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    const parsed = parseSnippet(snippet.content);
    expect(parsed.mcpServers['discord-mcp'].command).toBe('/usr/local/bin/node');
    expect(parsed.mcpServers['discord-mcp'].args).toEqual(['/abs/path/to/cli.js']);
  });

  it('appends --gateway when gateway: true', () => {
    const snippet = claudeDesktopGenerator.generate({ ...baseConfig, gateway: true });
    const parsed = parseSnippet(snippet.content);
    expect(parsed.mcpServers['discord-mcp'].args).toContain('--gateway');
  });

  it('omits --gateway when gateway is false or unset', () => {
    const noGateway = claudeDesktopGenerator.generate({ ...baseConfig, gateway: false });
    expect(parseSnippet(noGateway.content).mcpServers['discord-mcp'].args).not.toContain(
      '--gateway',
    );
    const omitted = claudeDesktopGenerator.generate(baseConfig);
    expect(parseSnippet(omitted.content).mcpServers['discord-mcp'].args).not.toContain('--gateway');
  });

  it('merges extra envVars alongside DISCORD_TOKEN', () => {
    const snippet = claudeDesktopGenerator.generate({
      ...baseConfig,
      envVars: { OTEL_ENABLED: 'true', MCP_AUDIT_SINK: 'stderr' },
    });
    const env = parseSnippet(snippet.content).mcpServers['discord-mcp'].env;
    expect(env.DISCORD_TOKEN).toBe('Bot abc123');
    expect(env.OTEL_ENABLED).toBe('true');
    expect(env.MCP_AUDIT_SINK).toBe('stderr');
  });

  it('configFilePath is non-empty and mentions all three OSes', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    expect(snippet.configFilePath.length).toBeGreaterThan(0);
    expect(snippet.configFilePath).toContain('macOS');
    expect(snippet.configFilePath).toContain('Windows');
    expect(snippet.configFilePath).toContain('Linux');
  });

  it('instructions reference Claude Desktop and restarting', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    expect(snippet.instructions).toMatch(/Claude Desktop/i);
    expect(snippet.instructions.toLowerCase()).toContain('restart');
  });

  it('content ends with a trailing newline', () => {
    const snippet = claudeDesktopGenerator.generate(baseConfig);
    expect(snippet.content.endsWith('\n')).toBe(true);
  });
});
