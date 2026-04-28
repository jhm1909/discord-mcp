import type { PreconditionStore } from '../stores/PreconditionStore.js';
import type { ToolMiddleware } from './compose.js';

export function preconditionMiddleware(store: PreconditionStore): ToolMiddleware {
  return {
    async onCallTool(ctx, next) {
      const required = ctx.meta.get('toolPreconditions') as readonly string[] | undefined;
      if (required === undefined || required.length === 0) {
        return next();
      }
      for (const id of required) {
        const prec = store.get(id);
        if (prec === undefined) {
          throw new Error(`Unknown precondition: ${id} (referenced by tool ${ctx.tool.name})`);
        }
        await prec.run(ctx);
      }
      return next();
    },
  };
}
