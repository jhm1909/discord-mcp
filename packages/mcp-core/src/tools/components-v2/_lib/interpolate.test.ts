import { describe, expect, it } from 'vitest';
import { interpolateTemplate } from './interpolate.js';

describe('interpolateTemplate', () => {
  it('substitutes {{var}} in string fields', () => {
    const out = interpolateTemplate({ a: 'hello {{name}}!' }, { name: 'world' });
    expect(out).toEqual({ a: 'hello world!' });
  });

  it('recurses into nested objects + arrays', () => {
    const out = interpolateTemplate(
      { type: 17, components: [{ type: 10, content: 'v{{ver}}' }] },
      { ver: '1.0' },
    );
    expect((out as { components: Array<{ content: string }> }).components[0]!.content).toBe('v1.0');
  });

  it('leaves missing variables as the literal placeholder', () => {
    const out = interpolateTemplate({ a: '{{missing}}' }, {});
    expect(out).toEqual({ a: '{{missing}}' });
  });

  it('handles multiple variables in one string', () => {
    const out = interpolateTemplate({ a: '{{x}} and {{y}}' }, { x: 'A', y: 'B' });
    expect(out).toEqual({ a: 'A and B' });
  });

  it('does not interpolate non-string values', () => {
    const out = interpolateTemplate({ n: 42, flag: true, arr: [1, 2] }, { x: 'A' });
    expect(out).toEqual({ n: 42, flag: true, arr: [1, 2] });
  });
});
