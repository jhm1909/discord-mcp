import { describe, it, expect } from 'vitest';
import componentsV2Validate from './validate.js';

describe('components_v2_validate', () => {
  it('returns valid:true for a sound layout', async () => {
    const T = componentsV2Validate;
    const t = new T({ name: 'components_v2_validate', path: 'inline', root: 'inline', store: null as never }, { name: 'components_v2_validate', enabled: true });
    const r = (await t.run(
      { components: [{ type: 10, content: 'hi' }] },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { valid: boolean; issues: unknown[] } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.valid).toBe(true);
    expect(r.structuredContent.issues).toEqual([]);
  });

  it('reports issues for invalid layout', async () => {
    const T = componentsV2Validate;
    const t = new T({ name: 'components_v2_validate', path: 'inline', root: 'inline', store: null as never }, { name: 'components_v2_validate', enabled: true });
    const r = (await t.run(
      { components: [{ type: 17, components: [{ type: 17, components: [{ type: 10, content: 'inner' }] }] }] },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { valid: boolean; issues: Array<{ code: string }> } };
    expect(r.structuredContent.valid).toBe(false);
    expect(r.structuredContent.issues.some((i) => i.code === 'CONTAINER_IN_CONTAINER')).toBe(true);
  });
});
