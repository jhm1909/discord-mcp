import { describe, expect, it } from 'vitest';
import guildGetWidgetImageUrl from './get_widget_image_url.js';
import '../../container.js';

describe('guild_get_widget_image_url', () => {
  it('synthesizes the URL with default shield style and no REST call', async () => {
    const T = guildGetWidgetImageUrl;
    const t = new T(
      {
        name: 'guild_get_widget_image_url',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'guild_get_widget_image_url', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000' },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { url: string; style: string } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.style).toBe('shield');
    expect(r.structuredContent.url).toBe(
      'https://discord.com/api/guilds/999000999000999000/widget.png?style=shield',
    );
  });

  it('honors banner style', async () => {
    const T = guildGetWidgetImageUrl;
    const t = new T(
      {
        name: 'guild_get_widget_image_url',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'guild_get_widget_image_url', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000', style: 'banner3' },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { url: string; style: string } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.url).toContain('style=banner3');
  });
});
