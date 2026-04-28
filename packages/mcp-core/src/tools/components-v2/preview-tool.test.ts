import { describe, expect, it } from 'vitest';
import preview from './preview-tool.js';

describe('components_v2_preview tool', () => {
  it('renders ASCII for a TextDisplay', async () => {
    const T = preview;
    const t = new T(
      { name: 'components_v2_preview', path: 'inline', root: 'inline', store: null as never },
      { name: 'components_v2_preview', enabled: true },
    );
    const r = (await t.run(
      { components: [{ type: 10, content: 'hello' }] },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { ascii: string };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.ascii).toContain('hello');
  });
});
