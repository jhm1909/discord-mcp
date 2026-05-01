import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../../test/setup.js';
import eventsGet from './get.js';
import '../../container.js';

const DISCORD_API = 'https://discord.com/api/v10';

describe('events_get', () => {
  it('GETs scheduled event with optional user count and wraps name/description', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaa');
    server.use(
      http.get(
        `${DISCORD_API}/guilds/:guildId/scheduled-events/:eventId`,
        async ({ request, params }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('with_user_count')).toBe('true');
          return HttpResponse.json({
            id: params.eventId,
            guild_id: params.guildId,
            name: 'Office Hours',
            description: 'weekly check-in',
            scheduled_start_time: '2026-05-01T15:00:00Z',
            scheduled_end_time: null,
            status: 1,
            entity_type: 2,
            channel_id: '111122223333444401',
            creator_id: '111122223333444499',
            entity_metadata: { location: 'main stage' },
            user_count: 7,
          });
        },
      ),
    );
    const T = eventsGet;
    const t = new T(
      { name: 'events_get', path: 'inline', root: 'inline', store: null as never },
      { name: 'events_get', enabled: true },
    );
    const r = (await t.run(
      {
        guild_id: '999000999000999000',
        event_id: '111122223333444402',
        with_user_count: true,
      },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { id: string; user_count?: number; untrusted_text: string };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.id).toBe('111122223333444402');
    expect(r.structuredContent.user_count).toBe(7);
    expect(r.structuredContent.untrusted_text).toContain('untrusted_discord_channel_topic');
    expect(r.structuredContent.untrusted_text).toContain('Office Hours');
    expect(r.structuredContent.untrusted_text).toContain('main stage');
  });
});
