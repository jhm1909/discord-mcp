import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, MessageId } from '../_lib/snowflake.js';

interface RawMessage {
  id: string;
  channel_id: string;
}

export default defineTool({
  name: 'polls_end',
  category: 'polls',
  description: [
    '**Purpose**: Immediately end a poll (expire it). The result message is updated by Discord.',
    '',
    '**Note**: Only the poll author (your bot) can end its own polls.',
    '',
    '**Returns**: `{ended, channel_id, message_id}`.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Channel containing the poll'),
    message_id: MessageId.describe('Poll message to expire'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    ended: z.literal(true),
    channel_id: ChannelId,
    message_id: MessageId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    (await container.rest.post(Routes.expirePoll(args.channel_id, args.message_id), {
      reason: args.audit_reason,
    })) as RawMessage;
    return dualResult({
      text: `Ended poll \`${args.message_id}\` in channel \`${args.channel_id}\`.`,
      data: {
        ended: true as const,
        channel_id: args.channel_id,
        message_id: args.message_id,
      },
    });
  },
});
