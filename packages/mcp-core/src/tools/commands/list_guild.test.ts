import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import commandsListGuild from './list_guild.js';
import '../../container.js';

describe('commands_list_guild', () => {
  it('returns guild app commands', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = commandsListGuild;
    const t = new T(
      { name: 'commands_list_guild', path: 'inline', root: 'inline', store: null as never },
      { name: 'commands_list_guild', enabled: true },
    );
    const r = (await t.run(
      { application_id: '111111111111111111', guild_id: '999000999000999000' },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { commands: Array<{ id: string; name: string }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(1);
    expect(r.structuredContent.commands[0]!.name).toBe('ping');
  });
});
