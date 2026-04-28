import { z } from 'zod';
import { ValidationError } from '../errors/client.js';
import type { ToolMiddleware } from './compose.js';

interface SchemaCarrier {
  readonly inputSchema: Record<string, z.ZodTypeAny>;
}

export function validateMiddleware(): ToolMiddleware {
  return {
    async onCallTool(ctx, next) {
      const piece = ctx.meta.get('toolPiece') as SchemaCarrier | undefined;
      if (piece === undefined) {
        return next();
      }
      const schema = z.object(piece.inputSchema);
      const parsed = schema.safeParse(ctx.args);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code,
          })),
        );
      }
      (ctx as { args: unknown }).args = parsed.data;
      return next();
    },
  };
}
