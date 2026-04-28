import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import channelsList from './list.js';
import '../../container.js';

describe('channels_list', () => {
  it('returns dualResult with id+name+type per channel', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = channelsList;
    const t = new T(
      { name: 'channels_list', path: 'inline', root: 'inline', store: null as never },
      { name: 'channels_list', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000' },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: {
        channels: Array<{ id: string; name: string; type: number }>;
        count: number;
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(3);
    expect(r.structuredContent.channels.map((c) => c.name)).toEqual([
      'general',
      'announcements',
      'voice-lobby',
    ]);
  });
});
