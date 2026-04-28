import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import rolesList from './list.js';
import '../../container.js';

describe('roles_list', () => {
  it('returns roles with id+name+color', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = rolesList;
    const t = new T(
      { name: 'roles_list', path: 'inline', root: 'inline', store: null as never },
      { name: 'roles_list', enabled: true },
    );
    const r = (await t.run(
      { guild_id: '999000999000999000' },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { roles: Array<{ id: string; name: string }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(2);
    expect(r.structuredContent.roles.map((rr) => rr.name)).toEqual(['@everyone', 'Moderator']);
  });
});
