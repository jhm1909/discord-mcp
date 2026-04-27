import { describe, it, expect } from 'vitest';
import { ToolStore } from './ToolStore.js';

describe('ToolStore', () => {
  it('exposes store name "tools"', () => {
    const store = new ToolStore();
    expect(store.name).toBe('tools');
  });
  it('starts empty', () => {
    const store = new ToolStore();
    expect(store.size).toBe(0);
  });
});
