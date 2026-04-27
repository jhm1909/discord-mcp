import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import './container.js'; // augments Container interface

describe('Container declaration-merge', () => {
  it('rest, logger, config slots compile-time present', () => {
    container.rest = {} as never;
    container.logger = {} as never;
    container.config = {} as never;
    expect(container.rest).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.config).toBeDefined();
  });
});
