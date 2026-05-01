import { describe, expect, it } from 'vitest';
import { CommandOption, pickCommandBody } from './_lib.js';

describe('commands/_lib', () => {
  it('CommandOption validates recursive subcommand groups', () => {
    const nested = {
      type: 2, // SUB_COMMAND_GROUP
      name: 'group1',
      description: 'group',
      options: [
        {
          type: 1, // SUB_COMMAND
          name: 'sub1',
          description: 'sub',
          options: [{ type: 3, name: 'arg', description: 'arg', required: true }],
        },
      ],
    };
    const parsed = CommandOption.parse(nested);
    expect(parsed.options[0].options[0].name).toBe('arg');
  });

  it('CommandOption rejects out-of-range type', () => {
    expect(() => CommandOption.parse({ type: 99, name: 'x', description: 'y' })).toThrow();
  });

  it('pickCommandBody drops undefined keys and ignores foreign fields', () => {
    const body = pickCommandBody({
      name: 'ping',
      description: undefined,
      foreign: 'ignored',
      nsfw: false,
    });
    expect(body).toEqual({ name: 'ping', nsfw: false });
  });
});
