import { describe, it, expect } from 'vitest';
import buildSection from './build_section.js';

describe('components_v2_build_section', () => {
  it('builds Section with TextDisplay components', async () => {
    const T = buildSection;
    const t = new T(
      { name: 'components_v2_build_section', path: 'inline', root: 'inline', store: null as never },
      { name: 'components_v2_build_section', enabled: true },
    );
    const r = (await t.run(
      { text: ['line 1', 'line 2'] },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { component: { type: number; components: Array<{ type: number; content: string }> } } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.component.type).toBe(9);
    expect(r.structuredContent.component.components).toHaveLength(2);
    expect(r.structuredContent.component.components[0]!.content).toBe('line 1');
  });

  it('attaches Thumbnail accessory when provided', async () => {
    const T = buildSection;
    const t = new T(
      { name: 'components_v2_build_section', path: 'inline', root: 'inline', store: null as never },
      { name: 'components_v2_build_section', enabled: true },
    );
    const r = (await t.run(
      {
        text: ['hello'],
        accessory: { type: 11, media: { url: 'https://example.com/img.png' } },
      },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { component: { accessory?: { type: number } } } };
    expect(r.structuredContent.component.accessory?.type).toBe(11);
  });
});
