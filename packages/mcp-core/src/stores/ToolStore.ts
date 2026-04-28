import { LoaderStrategy, Store, type FilterResult } from '@sapphire/pieces';
import { basename, extname, normalize, sep } from 'node:path';
import { Tool } from '../pieces/Tool.js';

declare module '@sapphire/pieces' {
  interface StoreRegistryEntries {
    tools: ToolStore;
  }
}

/**
 * Custom loader strategy that skips helper and test files from the tools directory.
 * - Skips files inside any `_lib` subdirectory.
 * - Skips `*.test.*` files (vitest test files).
 * Falls back to the default LoaderStrategy filter for everything else.
 */
class ToolLoaderStrategy extends LoaderStrategy<Tool> {
  public override filter(path: string): FilterResult {
    const normalized = normalize(path);
    const parts = normalized.split(sep);
    // Skip anything under a directory named `_lib`
    if (parts.includes('_lib')) return null;
    // Skip test files
    const ext = extname(path);
    const name = basename(path, ext);
    if (name.endsWith('.test') || name.endsWith('.spec')) return null;
    return super.filter(path);
  }
}

export class ToolStore extends Store<Tool, 'tools'> {
  public constructor() {
    super(Tool, { name: 'tools', strategy: new ToolLoaderStrategy() });
  }
}
