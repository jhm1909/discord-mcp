import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool } from './defineTool.js';

describe('defineTool', () => {
  it('produces a Tool subclass with correct name + schema', async () => {
    const EchoCls = defineTool({
      name: 'test_echo',
      description: 'Echo back input',
      inputSchema: { msg: z.string().describe('Message to echo') },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      handler: async ({ msg }) => ({ echoed: msg }),
    });

    const instance = new EchoCls(
      { name: 'test_echo', path: 'memory', root: 'memory', store: null as never },
      { name: 'test_echo', enabled: true },
    );

    expect(instance.name).toBe('test_echo');
    expect(instance.description).toBe('Echo back input');
    expect(instance.inputSchema.msg).toBeDefined();
    expect(instance.annotations.readOnlyHint).toBe(true);

    const result = await instance.run({ msg: 'hello' }, { signal: new AbortController().signal });
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('rejects names that violate snake_case verb-first rule', () => {
    expect(() =>
      defineTool({
        name: 'BadName',
        description: '',
        inputSchema: {},
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async () => ({}),
      }),
    ).toThrow(/snake_case/);
  });
});
