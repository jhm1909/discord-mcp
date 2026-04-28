import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import membersGet from './get.js';
import '../../container.js';

describe('members_get', () => {
  it('returns member profile with wrapped nick', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = membersGet;
    const t = new T(
      { name: 'members_get', path: 'inline', root: 'inline', store: null as never },
      { name: 'members_get', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000', user_id: '111122223333444455' },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: {
        user_id: string;
        username: string;
        nick: string | null;
        roles: string[];
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.user_id).toBe('111122223333444455');
    expect(r.structuredContent.username).toBe('alice');
    expect(r.structuredContent.roles).toEqual(['role1', 'role2']);
  });
});
