import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { compose, type MiddlewareContext, type ToolMiddleware } from './compose.js';
import { validateMiddleware } from './validate.js';
import { ValidationError } from '../errors/client.js';

interface DummyTool {
  inputSchema: Record<string, z.ZodTypeAny>;
}

const tool: DummyTool = {
  inputSchema: {
    channel_id: z.string().regex(/^\d{17,20}$/, 'must be 17-20 digit snowflake'),
    content: z.string().min(1, 'required'),
  },
};

function ctx(args: unknown, mw: ToolMiddleware): {
  dispatch: (a: unknown) => Promise<unknown>;
  middlewareCtx: MiddlewareContext<unknown>;
} {
  const middlewareCtx: MiddlewareContext<unknown> = {
    tool: { name: 'messages_send', category: 'messages', idempotent: false },
    args,
    meta: new Map<string, unknown>([['toolPiece', tool]]),
  };
  const dispatch = compose([mw], async (c) => c.args);
  return { dispatch: () => dispatch(middlewareCtx), middlewareCtx };
}

describe('validateMiddleware', () => {
  it('passes parsed args through when valid', async () => {
    const { dispatch } = ctx(
      { channel_id: '112233445566778899', content: 'hi' },
      validateMiddleware(),
    );
    const result = await dispatch(undefined);
    expect(result).toEqual({ channel_id: '112233445566778899', content: 'hi' });
  });

  it('throws ValidationError for missing field', async () => {
    const { dispatch } = ctx({ channel_id: '1' }, validateMiddleware());
    await expect(dispatch(undefined)).rejects.toBeInstanceOf(ValidationError);
  });

  it('ValidationError issues include both bad fields', async () => {
    const { dispatch } = ctx({ channel_id: 'short', content: '' }, validateMiddleware());
    try {
      await dispatch(undefined);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const ve = e as ValidationError;
      const paths = ve.issues.map((i) => i.path);
      expect(paths).toContain('channel_id');
      expect(paths).toContain('content');
    }
  });
});
