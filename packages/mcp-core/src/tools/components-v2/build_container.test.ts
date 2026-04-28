import { describe, expect, it } from 'vitest';
import buildContainer from './build_container.js';

describe('components_v2_build_container', () => {
  it('returns a valid Container JSON node', async () => {
    const T = buildContainer;
    const t = new T(
      {
        name: 'components_v2_build_container',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'components_v2_build_container', enabled: true },
    );
    const r = (await t.run(
      {
        components: [{ type: 10, content: 'hi' }],
        accent_color: 5793266,
      },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { component: { type: number; accent_color?: number } };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.component.type).toBe(17);
    expect(r.structuredContent.component.accent_color).toBe(5793266);
  });

  it('omits accent_color when not provided', async () => {
    const T = buildContainer;
    const t = new T(
      {
        name: 'components_v2_build_container',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'components_v2_build_container', enabled: true },
    );
    const r = (await t.run(
      { components: [{ type: 10, content: 'hi' }] },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { component: Record<string, unknown> } };
    expect(r.structuredContent.component['accent_color']).toBeUndefined();
  });
});
