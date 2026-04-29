import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, UserId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'threads_add_member',
  category: 'threads',
  description: [
    '**Purpose**: Add a guild user to a thread (private or public).',
    '',
    '**When to use**:',
    '- Loop a moderator or expert into an existing discussion.',
    '',
    '**When NOT to use**:',
    '- Mass-onboarding → mention them in the parent channel instead; spammy mass-add risks rate limits.',
    '',
    '**Returns**: `{added, thread_id, user_id}`.',
  ].join('\n'),
  inputSchema: {
    thread_id: ChannelId.describe('Thread to add the user to'),
    user_id: UserId.describe('User to add'),
  },
  outputSchema: {
    added: z.literal(true),
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
    await container.rest.put(Routes.threadMembers(args.thread_id, args.user_id));
    return dualResult({
      text: `Added <@${args.user_id}> to thread <#${args.thread_id}>.`,
      data: { added: true as const, thread_id: args.thread_id, user_id: args.user_id },
    });
  },
});
