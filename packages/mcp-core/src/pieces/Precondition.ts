import { Piece } from '@sapphire/pieces';
import type { MiddlewareContext } from '../middleware/compose.js';

export abstract class Precondition extends Piece<Precondition.Options, 'preconditions'> {
  public abstract readonly identifier: string;
  public abstract run(ctx: MiddlewareContext<unknown>): Promise<void>;
}

export namespace Precondition {
  export type Options = Piece.Options;
}
