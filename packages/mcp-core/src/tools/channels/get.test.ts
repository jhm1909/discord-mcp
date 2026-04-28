import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import channelsGet from './get.js';
import '../../container.js';

describe('channels_get', () => {
  it('returns full channel record', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = channelsGet;
    const t = new T(
      { name: 'channels_get', path: 'inline', root: 'inline', store: null as never },
      { name: 'channels_get', enabled: true },
    );
    const r = (await t.run({ channel_id: '111122223333444455' }, { signal: new AbortController().signal })) as {
      isError: boolean;
      structuredContent: { id: string; name: string; topic: string };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.id).toBe('111122223333444455');
    expect(r.structuredContent.name).toBe('general');
    expect(r.structuredContent.topic).toBe('Main discussion');
  });
});
