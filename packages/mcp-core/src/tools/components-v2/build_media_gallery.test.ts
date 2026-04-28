import { describe, expect, it } from 'vitest';
import buildMediaGallery from './build_media_gallery.js';

describe('components_v2_build_media_gallery', () => {
  it('builds MediaGallery from items', async () => {
    const T = buildMediaGallery;
    const t = new T(
      {
        name: 'components_v2_build_media_gallery',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'components_v2_build_media_gallery', enabled: true },
    );
    const r = (await t.run(
      {
        items: [
          { url: 'https://example.com/a.png' },
          { url: 'https://example.com/b.png', description: 'caption', spoiler: true },
        ],
      },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: {
        component: {
          type: number;
          items: Array<{ media: { url: string }; description?: string; spoiler?: boolean }>;
        };
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.component.type).toBe(12);
    expect(r.structuredContent.component.items).toHaveLength(2);
    expect(r.structuredContent.component.items[0]!.media.url).toBe('https://example.com/a.png');
    expect(r.structuredContent.component.items[1]!.description).toBe('caption');
    expect(r.structuredContent.component.items[1]!.spoiler).toBe(true);
  });
});
