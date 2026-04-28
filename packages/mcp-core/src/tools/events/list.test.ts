import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import eventsList from './list.js';
import '../../container.js';

describe('events_list', () => {
  it('returns scheduled events', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = eventsList;
    const t = new T(
      { name: 'events_list', path: 'inline', root: 'inline', store: null as never },
      { name: 'events_list', enabled: true },
    );
    const r = (await t.run({ guild_id: '999000999000999000' }, { signal: new AbortController().signal })) as {
      isError: boolean;
      structuredContent: { events: Array<{ id: string; name: string }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(1);
    expect(r.structuredContent.events[0]!.name).toBe('Office Hours');
  });
});
