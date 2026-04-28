import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import usersGetCurrent from './get_current.js';
import '../../container.js';

describe('users_get_current', () => {
  it('returns the bot user profile', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = usersGetCurrent;
    const t = new T(
      { name: 'users_get_current', path: 'inline', root: 'inline', store: null as never },
      { name: 'users_get_current', enabled: true },
    );
    const r = (await t.run({}, { signal: new AbortController().signal })) as {
      isError: boolean;
      structuredContent: { id: string; username: string; bot: boolean };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.username).toBe('discord-mcp-bot');
    expect(r.structuredContent.bot).toBe(true);
  });
});
