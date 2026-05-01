import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, UserId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'threads_remove_member',
  category: 'threads',
  description: [
    '**Purpose**: Remove a guild user from a thread.',
    '',
    '**When to use**:',
    '- Drop a user out of a private thread; thread cleanup.',
    '',
    '**When NOT to use**:',
    '- Removing the bot itself → use `threads_leave`.',
    '',
    '**Returns**: `{removed, thread_id, user_id}`.',
  ].join('\n'),
  inputSchema: {
    thread_id: ChannelId.describe('Thread to remove from'),
    user_id: UserId.describe('User to remove'),
  },
  outputSchema: {
    removed: z.literal(true),
    thread_id: ChannelId,
    user_id: UserId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    await container.rest.delete(Routes.threadMembers(args.thread_id, args.user_id));
    return dualResult({
      text: `Removed <@${args.user_id}> from thread <#${args.thread_id}>.`,
      data: { removed: true as const, thread_id: args.thread_id, user_id: args.user_id },
    });
  },
});
