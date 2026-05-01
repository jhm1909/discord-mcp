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
  name: 'threads_get_member',
  category: 'threads',
  description: [
    "**Purpose**: Look up one user's thread-membership record (join timestamp, flags).",
    '',
    '**When to use**:',
    '- Verify a user is in a thread before performing thread-only actions.',
    '',
    '**Returns**: `{thread_id, user_id, join_timestamp, flags}`. Returns 404-shaped error if the user is not a member.',
  ].join('\n'),
  inputSchema: {
    thread_id: ChannelId.describe('Thread to look up'),
    user_id: UserId.describe('User to query'),
    with_member: z
      .boolean()
      .optional()
      .describe('Include the underlying guild member object in the Discord response'),
  },
  outputSchema: {
    thread_id: ChannelId,
    user_id: UserId,
    join_timestamp: z.string().nullable(),
    flags: z.number().int().nullable(),
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
    const m = (await container.rest.get(
      Routes.threadMembers(args.thread_id, args.user_id),
      query.size > 0 ? { query } : undefined,
    )) as RawThreadMember;
    return dualResult({
      text: `Member <@${args.user_id}> joined thread <#${args.thread_id}> at ${m.join_timestamp ?? 'unknown'}.`,
      data: {
        thread_id: args.thread_id,
        user_id: args.user_id,
        join_timestamp: m.join_timestamp ?? null,
        flags: m.flags ?? null,
      },
    });
  },
});
