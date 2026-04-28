import { describe, expect, it, vi } from 'vitest';
import { type CallNext, compose, type MiddlewareContext, type ToolMiddleware } from './compose.js';

interface TestVal {
  readonly args: { v: number };
}

const baseCtx: MiddlewareContext<TestVal> = {
  tool: { name: 'test', category: 'meta', idempotent: false },
  args: { v: 1 } as never,
  meta: new Map(),
};

describe('compose middleware', () => {
  it('runs middlewares outer→inner→handler→inner→outer (Koa onion)', async () => {
    const order: string[] = [];

    const outer: ToolMiddleware = {
      async onCallTool(_ctx, next) {
        order.push('outer-pre');
        const r = await next();
        order.push('outer-post');
        return r;
      },
    };
    const middle: ToolMiddleware = {
      async onCallTool(_ctx, next) {
        order.push('middle-pre');
        const r = await next();
        order.push('middle-post');
        return r;
      },
    };
    const handler: CallNext<TestVal, string> = async () => {
      order.push('handler');
      return 'ok';
    };

    const dispatch = compose([outer, middle], handler);
    const result = await dispatch(baseCtx as never);
    expect(result).toBe('ok');
    expect(order).toEqual(['outer-pre', 'middle-pre', 'handler', 'middle-post', 'outer-post']);
  });

  it('a middleware can short-circuit by NOT calling next()', async () => {
    const handler = vi.fn(async () => 'unreached');
    const blocker: ToolMiddleware = {
      async onCallTool(_ctx) {
        return 'blocked';
      },
    };
    const dispatch = compose([blocker], handler);
    const result = await dispatch(baseCtx as never);
    expect(result).toBe('blocked');
    expect(handler).not.toHaveBeenCalled();
  });

  it('throws if next() called twice', async () => {
    const buggy: ToolMiddleware = {
      async onCallTool(_ctx, next) {
        await next();
        await next();
        return 'x';
      },
    };
    const dispatch = compose([buggy], async () => 'h');
    await expect(dispatch(baseCtx as never)).rejects.toThrow(/next.*multiple times/i);
  });

  it('with no middlewares, the handler runs directly', async () => {
    const dispatch = compose([], async () => 42);
    expect(await dispatch(baseCtx as never)).toBe(42);
  });

  it('errors thrown inside the handler propagate up through next()', async () => {
    const captured: unknown[] = [];
    const observer: ToolMiddleware = {
      async onCallTool(_ctx, next) {
        try {
          return await next();
        } catch (e) {
          captured.push(e);
          throw e;
        }
      },
    };
    const dispatch = compose([observer], async () => {
      throw new Error('boom');
    });
    await expect(dispatch(baseCtx as never)).rejects.toThrow('boom');
    expect(captured).toHaveLength(1);
  });

  it('a middleware without onCallTool is a no-op (passes through)', async () => {
    const noop: ToolMiddleware = {};
    const dispatch = compose([noop], async () => 'ok');
    expect(await dispatch(baseCtx as never)).toBe('ok');
  });
});
