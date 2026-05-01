import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { GuildId, ScheduledEventId, UserId } from '../_lib/snowflake.js';

interface RawEventUser {
  guild_scheduled_event_id: string;
  user: {
    id: string;
    username: string;
    global_name?: string | null;
    bot?: boolean;
  };
  member?: {
    nick: string | null;
    roles: string[];
    joined_at: string;
  };
}

export default defineTool({
  name: 'events_list_users',
  category: 'events',
  description: [
    '**Purpose**: List users subscribed (RSVP) to a scheduled event.',
    '',
    '**When to use**:',
    '- Inspect attendance/interest for an upcoming event.',
    '',
    '**Pagination**: Use `before`/`after` user-id cursors. `limit` 1-100.',
    '',
    '**Returns**: `{users:[{user_id, username, bot, member?}], count, event_id}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild that owns the event'),
    event_id: ScheduledEventId.describe('Scheduled event id'),
    limit: z.number().int().min(1).max(100).optional().describe('Max users (1-100, default 100)'),
    with_member: z.boolean().optional().describe('Include guild member object for each user'),
    before: UserId.optional().describe('Pagination cursor: users with id < this'),
    after: UserId.optional().describe('Pagination cursor: users with id > this'),
  },
  outputSchema: {
    users: z.array(
      z.object({
        user_id: UserId,
        username: z.string(),
        bot: z.boolean(),
        nick: z.string().nullable().optional(),
      }),
    ),
    count: z.number().int(),
    event_id: ScheduledEventId,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const query = new URLSearchParams();
    if (args.limit !== undefined) query.set('limit', String(args.limit));
    if (args.with_member !== undefined) query.set('with_member', String(args.with_member));
    if (args.before !== undefined) query.set('before', args.before);
    if (args.after !== undefined) query.set('after', args.after);
    const raw = (await container.rest.get(
      Routes.guildScheduledEventUsers(args.guild_id, args.event_id),
      query.size > 0 ? { query } : undefined,
    )) as RawEventUser[];
    const users = raw.map((u) => ({
      user_id: u.user.id,
      username: u.user.global_name ?? u.user.username,
      bot: u.user.bot ?? false,
      nick: u.member?.nick ?? null,
    }));
    return dualResult({
      text: `**${users.length} user(s)** RSVPed to event \`${args.event_id}\`.`,
      data: { users, count: users.length, event_id: args.event_id },
    });
  },
});
