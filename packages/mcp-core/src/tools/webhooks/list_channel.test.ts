import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import webhooksListChannel from './list_channel.js';
import '../../container.js';

describe('webhooks_list_channel', () => {
  it('returns channel webhooks', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = webhooksListChannel;
    const t = new T(
      { name: 'webhooks_list_channel', path: 'inline', root: 'inline', store: null as never },
      { name: 'webhooks_list_channel', enabled: true },
    );
    const r = (await t.run(
      { channel_id: '111122223333444455' },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { webhooks: Array<{ id: string; name: string }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(1);
    expect(r.structuredContent.webhooks[0]!.name).toBe('CI Notifier');
  });
});
