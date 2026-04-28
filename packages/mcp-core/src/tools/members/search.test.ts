import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import membersSearch from './search.js';
import '../../container.js';

describe('members_search', () => {
  it('returns matches array with username + user_id', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = membersSearch;
    const t = new T(
      { name: 'members_search', path: 'inline', root: 'inline', store: null as never },
      { name: 'members_search', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000', query: 'match', limit: 2 },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { matches: Array<{ user_id: string; username: string }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(2);
    expect(r.structuredContent.matches.map((m) => m.username)).toEqual(['match1', 'match2']);
  });
});
