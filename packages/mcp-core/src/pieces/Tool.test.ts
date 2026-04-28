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

  it('subclass can declare category and preconditions[]', () => {
    class CategorizedTool extends Tool {
      override readonly category = 'messages';
      override readonly preconditions = ['category_enabled'] as const;
      override readonly inputSchema = {};
      override readonly description = 'cat';
      override readonly annotations = {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      };
      override async run() {
        return {};
      }
    }
    const t = new CategorizedTool(
      { name: 'cat', path: 'memory', root: 'memory', store: null as never },
      { name: 'cat', enabled: true },
    );
    expect(t.category).toBe('messages');
    expect(t.preconditions).toEqual(['category_enabled']);
  });
});
