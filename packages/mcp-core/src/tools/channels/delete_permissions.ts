import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, Snowflake } from '../_lib/snowflake.js';

export default defineTool({
  name: 'channels_delete_permissions',
  category: 'channels',
  description: [
    '**Purpose**: Remove a permission overwrite from a channel.',
    '',
    '**When to use**:',
    '- Revert a channel back to inheriting role/category defaults.',
    '',
    '**When NOT to use**:',
    '- Changing allow/deny bits → use `channels_modify_permissions`.',
    '',
    '**Returns**: `{deleted, channel_id, overwrite_id}`. Removing an overwrite that does not exist is treated as success by Discord.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Channel whose overwrite is being removed'),
    overwrite_id: Snowflake.describe('Role ID or user ID whose overwrite to remove'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    deleted: z.literal(true),
    channel_id: ChannelId,
    overwrite_id: Snowflake,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    await container.rest.delete(Routes.channelPermission(args.channel_id, args.overwrite_id), {
      reason: args.audit_reason,
    });
    return dualResult({
      text: `Removed permission overwrite for \`${args.overwrite_id}\` from <#${args.channel_id}>.`,
      data: {
        deleted: true as const,
        channel_id: args.channel_id,
        overwrite_id: args.overwrite_id,
      },
    });
  },
});
