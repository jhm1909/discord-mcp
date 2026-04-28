import { HttpResponse, http } from 'msw';

const DISCORD_API = 'https://discord.com/api/v10';

export const handlers = [
  // Default: messages_send happy path
  http.post(`${DISCORD_API}/channels/:channelId/messages`, async ({ params, request }) => {
    const body = (await request.json()) as {
      content?: string;
      tts?: boolean;
      flags?: number;
      components?: unknown[];
    };
    return HttpResponse.json({
      id: '999000999000999000',
      channel_id: params['channelId'],
      content: body.content ?? '',
      tts: body.tts ?? false,
      timestamp: '2026-04-28T12:00:00.000000+00:00',
      author: { id: '111', username: 'TestBot', global_name: 'TestBot', bot: true },
      type: 0,
      ...(body.flags !== undefined && { flags: body.flags }),
      ...(body.components !== undefined && { components: body.components }),
    });
  }),
  // messages_read
  http.get(`${DISCORD_API}/channels/:channelId/messages`, async ({ params, request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    const items = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      id: `msg_${i + 1}`,
      channel_id: params['channelId'],
      content: `message ${i + 1} content`,
      author: {
        id: `user_${i + 1}`,
        username: `user${i + 1}`,
        global_name: `User ${i + 1}`,
        bot: false,
      },
      timestamp: '2026-04-28T12:00:00.000000+00:00',
      edited_timestamp: null,
      attachments: [],
      embeds: [],
    }));
    return HttpResponse.json(items);
  }),
  // channels_list
  http.get(`${DISCORD_API}/guilds/:guildId/channels`, async ({ params }) => {
    return HttpResponse.json([
      {
        id: 'ch1',
        name: 'general',
        type: 0,
        position: 0,
        parent_id: null,
        nsfw: false,
        guild_id: params['guildId'],
      },
      {
        id: 'ch2',
        name: 'announcements',
        type: 5,
        position: 1,
        parent_id: null,
        nsfw: false,
        guild_id: params['guildId'],
      },
      {
        id: 'ch3',
        name: 'voice-lobby',
        type: 2,
        position: 2,
        parent_id: null,
        guild_id: params['guildId'],
      },
    ]);
  }),
  // channels_get — must come AFTER the :channelId/messages route
  http.get(`${DISCORD_API}/channels/:channelId`, async ({ params }) => {
    return HttpResponse.json({
      id: params['channelId'],
      name: 'general',
      type: 0,
      position: 0,
      parent_id: null,
      nsfw: false,
      topic: 'Main discussion',
      rate_limit_per_user: 0,
      guild_id: '999000999000999000',
    });
  }),
  // members_get
  http.get(`${DISCORD_API}/guilds/:guildId/members/:userId`, async ({ params }) => {
    return HttpResponse.json({
      user: {
        id: params['userId'],
        username: 'alice',
        global_name: 'Alice',
        avatar: 'abc123',
        bot: false,
      },
      nick: 'alice the dev',
      roles: ['role1', 'role2'],
      joined_at: '2026-01-15T10:00:00.000000+00:00',
      premium_since: null,
      pending: false,
    });
  }),
  // members_search
  http.post(`${DISCORD_API}/guilds/:guildId/members-search`, async ({ request }) => {
    const body = (await request.json()) as { limit?: number };
    const limit = body.limit ?? 25;
    return HttpResponse.json({
      members: Array.from({ length: Math.min(limit, 2) }, (_, i) => ({
        member: {
          user: { id: `u_${i + 1}`, username: `match${i + 1}`, global_name: `Match ${i + 1}` },
          nick: null,
          roles: [],
          joined_at: '2026-01-15T10:00:00.000000+00:00',
          premium_since: null,
          pending: false,
        },
      })),
    });
  }),
  // roles_list
  http.get(`${DISCORD_API}/guilds/:guildId/roles`, async () => {
    return HttpResponse.json([
      {
        id: 'r1',
        name: '@everyone',
        color: 0,
        position: 0,
        permissions: '0',
        mentionable: false,
        hoist: false,
        managed: false,
      },
      {
        id: 'r2',
        name: 'Moderator',
        color: 16711680,
        position: 5,
        permissions: '8',
        mentionable: true,
        hoist: true,
        managed: false,
      },
    ]);
  }),
  // events_list — must come BEFORE guilds/:guildId to avoid prefix match
  http.get(`${DISCORD_API}/guilds/:guildId/scheduled-events`, async () => {
    return HttpResponse.json([
      {
        id: 'ev1',
        guild_id: '999000999000999000',
        name: 'Office Hours',
        scheduled_start_time: '2026-05-01T15:00:00Z',
        scheduled_end_time: '2026-05-01T16:00:00Z',
        status: 1,
        entity_type: 2,
        channel_id: 'voice1',
        description: null,
        creator_id: 'u1',
      },
    ]);
  }),
  // guild_get
  http.get(`${DISCORD_API}/guilds/:guildId`, async ({ params }) => {
    return HttpResponse.json({
      id: params['guildId'],
      name: 'My Test Server',
      icon: 'icon_hash',
      owner_id: 'owner1',
      member_count: 42,
      description: 'A test guild for discord-mcp',
      premium_tier: 2,
      preferred_locale: 'en-US',
      features: ['COMMUNITY', 'NEWS'],
    });
  }),
  // users_get_current — @me is percent-encoded as %40me in the actual request URL
  http.get(`${DISCORD_API}/users/%40me`, async () => {
    return HttpResponse.json({
      id: 'bot_id_123456789012345',
      username: 'discord-mcp-bot',
      global_name: 'Discord MCP Bot',
      bot: true,
      avatar: 'avatar_hash',
      verified: true,
    });
  }),
  // commands_list_guild
  http.get(`${DISCORD_API}/applications/:appId/guilds/:guildId/commands`, async ({ params }) => {
    return HttpResponse.json([
      {
        id: 'cmd1',
        application_id: params['appId'],
        guild_id: params['guildId'],
        name: 'ping',
        description: 'Ping the bot',
        type: 1,
        options: [],
      },
    ]);
  }),
  // webhooks_list_channel
  http.get(`${DISCORD_API}/channels/:channelId/webhooks`, async ({ params }) => {
    return HttpResponse.json([
      {
        id: 'wh1',
        name: 'CI Notifier',
        type: 1,
        channel_id: params['channelId'],
        application_id: null,
        avatar: null,
      },
    ]);
  }),
  // messages_edit
  http.patch(
    `${DISCORD_API}/channels/:channelId/messages/:messageId`,
    async ({ params, request }) => {
      const body = (await request.json()) as {
        content?: string;
        flags?: number;
        components?: unknown[];
      };
      return HttpResponse.json({
        id: params['messageId'],
        channel_id: params['channelId'],
        content: body.content ?? '',
        edited_timestamp: '2026-04-28T13:00:00.000000+00:00',
        ...(body.flags !== undefined && { flags: body.flags }),
        ...(body.components !== undefined && { components: body.components }),
      });
    },
  ),
  // messages_delete
  http.delete(`${DISCORD_API}/channels/:channelId/messages/:messageId`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),
  // audit_log_get
  http.get(`${DISCORD_API}/guilds/:guildId/audit-logs`, async ({ request }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? 50);
    return HttpResponse.json({
      audit_log_entries: Array.from({ length: Math.min(limit, 2) }, (_, i) => ({
        id: `entry_${i + 1}`,
        target_id: `target_${i + 1}`,
        user_id: `mod_${i + 1}`,
        action_type: 20 + i,
        reason: `reason ${i + 1}`,
        changes: [],
      })),
      users: [],
      webhooks: [],
      integrations: [],
    });
  }),
];
