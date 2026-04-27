import { Store } from '@sapphire/pieces';
import { Tool } from '../pieces/Tool.js';

declare module '@sapphire/pieces' {
  interface StoreRegistryEntries {
    tools: ToolStore;
  }
}

export class ToolStore extends Store<Tool, 'tools'> {
  public constructor() {
    super(Tool, { name: 'tools' });
  }
}
