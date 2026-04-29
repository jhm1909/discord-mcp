import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { GuildId, UserId } from '../_lib/snowflake.js';

interface RawBan {
  user: { id: string; username: string; global_name?: string | null };
  reason: string | null;
}

export default defineTool({
  name: 'members_list_bans',
  category: 'members',
  description: [
    '**Purpose**: List bans in a guild (paginated).',
    '',
    '**When to use**:',
    '- Audit moderation history; export ban list.',
    '',
    '**Pagination**: `before`/`after` are user-id cursors. `limit` 1-1000.',
    '',
    '**Returns**: `{bans:[{user_id, username, reason}], count}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to list bans for'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Max bans per page (1-1000, default 1000)'),
    before: UserId.optional().describe('Pagination cursor: bans with user-id < this'),
    after: UserId.optional().describe('Pagination cursor: bans with user-id > this'),
  },
  outputSchema: {
    bans: z.array(
      z.object({
        user_id: UserId,
        username: z.string(),
        reason: z.string().nullable(),
      }),
    ),
    count: z.number().int(),
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
    if (args.before !== undefined) query.set('before', args.before);
    if (args.after !== undefined) query.set('after', args.after);
    const raw = (await container.rest.get(
      Routes.guildBans(args.guild_id),
      query.size > 0 ? { query } : undefined,
    )) as RawBan[];
    const bans = raw.map((b) => ({
      user_id: b.user.id,
      username: b.user.username,
      reason: b.reason,
    }));
    return dualResult({
      text: `Found ${bans.length} ban(s) in guild \`${args.guild_id}\`.`,
      data: { bans, count: bans.length },
    });
  },
});
