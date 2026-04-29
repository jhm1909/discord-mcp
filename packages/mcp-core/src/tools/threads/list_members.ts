import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, UserId } from '../_lib/snowflake.js';

interface RawThreadMember {
  id?: string;
  user_id?: string;
  join_timestamp?: string;
  flags?: number;
}

export default defineTool({
  name: 'threads_list_members',
  category: 'threads',
  description: [
    '**Purpose**: List members of a thread.',
    '',
    '**When to use**:',
    '- Audit who is in a private thread; build mention lists.',
    '',
    '**Pagination**: Discord requires the `GUILD_MEMBERS` privileged intent for `with_member=true`. `after` is a snowflake cursor.',
    '',
    '**Returns**: `{members:[{user_id, join_timestamp, flags}], count, thread_id}`.',
  ].join('\n'),
  inputSchema: {
    thread_id: ChannelId.describe('Thread to list members for'),
    with_member: z
      .boolean()
      .optional()
      .describe('Whether Discord should hydrate the underlying guild member object'),
    after: UserId.optional().describe('Pagination cursor: get members with id > this'),
    limit: z.number().int().min(1).max(100).optional().describe('Max results (1-100, default 100)'),
  },
  outputSchema: {
    members: z.array(
      z.object({
        user_id: UserId.nullable(),
        join_timestamp: z.string().nullable(),
        flags: z.number().int().nullable(),
      }),
    ),
    count: z.number().int(),
    thread_id: ChannelId,
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
    if (args.with_member === true) query.set('with_member', 'true');
    if (args.after !== undefined) query.set('after', args.after);
    if (args.limit !== undefined) query.set('limit', String(args.limit));
    const raw = (await container.rest.get(
      Routes.threadMembers(args.thread_id),
      query.size > 0 ? { query } : undefined,
    )) as RawThreadMember[];
    const members = raw.map((m) => ({
      user_id: m.user_id ?? null,
      join_timestamp: m.join_timestamp ?? null,
      flags: m.flags ?? null,
    }));
    return dualResult({
      text: `**${members.length} member(s)** in thread <#${args.thread_id}>.`,
      data: { members, count: members.length, thread_id: args.thread_id },
    });
  },
});
