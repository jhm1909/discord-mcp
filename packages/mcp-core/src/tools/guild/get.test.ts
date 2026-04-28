import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import guildGet from './get.js';
import '../../container.js';

describe('guild_get', () => {
  it('returns guild metadata', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = guildGet;
    const t = new T({ name: 'guild_get', path: 'inline', root: 'inline', store: null as never }, { name: 'guild_get', enabled: true });
    const r = (await t.run({ guild_id: '999000999000999000' }, { signal: new AbortController().signal })) as {
      isError: boolean;
      structuredContent: { id: string; name: string; member_count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.name).toBe('My Test Server');
    expect(r.structuredContent.member_count).toBe(42);
  });
});
