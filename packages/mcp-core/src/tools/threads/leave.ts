import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'threads_leave',
  category: 'threads',
  description: [
    '**Purpose**: Remove the current bot user from a thread.',
    '',
    '**When to use**:',
    '- Bot finished its task in the thread; reduce noise / event fanout.',
    '',
    '**When NOT to use**:',
    '- Removing a different user → use `threads_remove_member`.',
    '',
    '**Returns**: `{left, thread_id}`. Idempotent.',
  ].join('\n'),
  inputSchema: {
    thread_id: ChannelId.describe('Thread to leave'),
  },
  outputSchema: {
    left: z.literal(true),
    thread_id: ChannelId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    await container.rest.delete(Routes.threadMembers(args.thread_id, '@me'));
    return dualResult({
      text: `Left thread <#${args.thread_id}>.`,
      data: { left: true as const, thread_id: args.thread_id },
    });
  },
});
