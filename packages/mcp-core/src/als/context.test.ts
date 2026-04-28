import { describe, it, expect } from 'vitest';
import { runWithCtx, getCtx, tryGetCtx, type ToolRequestContext } from './context.js';

const sample: ToolRequestContext = {
  requestId: 'req-1',
  toolName: 'messages_send',
  transport: 'stdio',
  signal: new AbortController().signal,
};

describe('AsyncLocalStorage context', () => {
  it('runWithCtx exposes the context to nested awaits', async () => {
    await runWithCtx(sample, async () => {
      const ctx = getCtx();
      expect(ctx.requestId).toBe('req-1');
      expect(ctx.toolName).toBe('messages_send');

      await new Promise<void>((r) =>
        setTimeout(() => {
          expect(getCtx().requestId).toBe('req-1');
          r();
        }, 0),
      );
    });
  });

  it('getCtx outside runWithCtx throws a clear error', () => {
    expect(() => getCtx()).toThrow(/no active tool request context/i);
  });

  it('tryGetCtx returns undefined outside runWithCtx', () => {
    expect(tryGetCtx()).toBeUndefined();
  });

  it('two parallel runWithCtx calls keep contexts isolated', async () => {
    const a = runWithCtx({ ...sample, requestId: 'A' }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return getCtx().requestId;
    });
    const b = runWithCtx({ ...sample, requestId: 'B' }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return getCtx().requestId;
    });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toBe('A');
    expect(rb).toBe('B');
  });
});
