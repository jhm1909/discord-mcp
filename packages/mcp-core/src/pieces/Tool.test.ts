import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Tool } from './Tool.js';

class TestTool extends Tool {
  override readonly inputSchema = { foo: z.string() };
  override readonly description = 'Test tool';
  override readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  override async run(args: { foo: string }) {
    return { echoed: args.foo };
  }
}

describe('Tool base class', () => {
  it('subclass exposes name, description, schema, annotations, run', () => {
    const t = new TestTool(
      { name: 'test_echo', path: 'memory', root: 'memory', store: null as never },
      { name: 'test_echo', enabled: true },
    );
    expect(t.name).toBe('test_echo');
    expect(t.description).toBe('Test tool');
    expect(t.inputSchema.foo).toBeDefined();
    expect(t.annotations.readOnlyHint).toBe(true);
  });
});
