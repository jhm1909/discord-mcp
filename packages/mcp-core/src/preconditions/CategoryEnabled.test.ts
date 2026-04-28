import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScopeRejectedError } from '../errors/client.js';
import type { MiddlewareContext } from '../middleware/compose.js';
import { CategoryEnabled } from './CategoryEnabled.js';

const piece = (env: Record<string, string | undefined>): CategoryEnabled => {
  return new CategoryEnabled(
    { name: 'category_enabled', path: 'inline', root: 'inline', store: null as never },
    { name: 'category_enabled', enabled: true },
    env,
  );
};

const ctx = (category: string): MiddlewareContext<unknown> => ({
  tool: { name: 't', category, idempotent: false },
  args: {},
  meta: new Map(),
});

describe('CategoryEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('passes when MCP_CATEGORIES is unset (all categories enabled)', async () => {
    const p = piece({});
    await expect(p.run(ctx('messages'))).resolves.toBeUndefined();
  });

  it('passes when tool category is in MCP_CATEGORIES', async () => {
    const p = piece({ MCP_CATEGORIES: 'messages,channels,guild' });
    await expect(p.run(ctx('messages'))).resolves.toBeUndefined();
  });

  it('throws ScopeRejectedError when tool category is not in MCP_CATEGORIES', async () => {
    const p = piece({ MCP_CATEGORIES: 'messages,channels' });
    await expect(p.run(ctx('moderation'))).rejects.toBeInstanceOf(ScopeRejectedError);
  });

  it('rejected error includes tool name + missing category + granted list', async () => {
    const p = piece({ MCP_CATEGORIES: 'messages,channels' });
    try {
      await p.run(ctx('moderation'));
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ScopeRejectedError);
      const sre = e as ScopeRejectedError;
      expect(sre.required).toBe('moderation');
      expect(sre.granted).toEqual(['messages', 'channels']);
    }
  });

  it('trims whitespace + ignores empty entries', async () => {
    const p = piece({ MCP_CATEGORIES: ' messages , , channels ,  ' });
    await expect(p.run(ctx('messages'))).resolves.toBeUndefined();
    await expect(p.run(ctx('channels'))).resolves.toBeUndefined();
    await expect(p.run(ctx('roles'))).rejects.toBeInstanceOf(ScopeRejectedError);
  });
});
