import { Store } from '@sapphire/pieces';
import { Precondition } from '../pieces/Precondition.js';

declare module '@sapphire/pieces' {
  interface StoreRegistryEntries {
    preconditions: PreconditionStore;
  }
}

export class PreconditionStore extends Store<Precondition, 'preconditions'> {
  public constructor() {
    super(Precondition, { name: 'preconditions' });
  }
}
