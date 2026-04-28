import { Precondition } from '../pieces/Precondition.js';
import { DryRunPreview } from '../errors/client.js';
import type { MiddlewareContext } from '../middleware/compose.js';

export class ConfirmRequired extends Precondition {
  public override readonly identifier = 'confirm_required';
  private readonly env: Record<string, string | undefined>;

  public constructor(
    context: Precondition.Options & { name: string; path: string; root: string; store: never },
    options: Precondition.Options,
    env: Record<string, string | undefined> = process.env,
  ) {
    super(context as never, options);
    this.env = env;
  }

  public override async run(ctx: MiddlewareContext<unknown>): Promise<void> {
    const dryRunActive = this.env['MCP_DRY_RUN'] !== 'false';
    const args = ctx.args as Record<string, unknown>;
    const confirmed = args['__confirm'] === true;

    if (dryRunActive || !confirmed) {
      const preview: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args)) {
        if (k !== '__confirm') {
          preview[k] = v;
        }
      }
      throw new DryRunPreview(ctx.tool.name, preview);
    }
  }
}
