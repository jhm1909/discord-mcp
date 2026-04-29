import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { PERMISSION_OVERWRITE_TYPE_VALUES } from '../_lib/discord-enums.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, Snowflake } from '../_lib/snowflake.js';

export default defineTool({
  name: 'channels_modify_permissions',
  category: 'channels',
  description: [
    '**Purpose**: Create or replace a permission overwrite for a role or user on a channel.',
    '',
    '**When to use**:',
    '- Restrict a channel to a specific role; allow a moderator to manage messages.',
    '',
    '**When NOT to use**:',
    '- Removing the overwrite entirely → use `channels_delete_permissions`.',
    '',
    '**`type`**: 0 = role overwrite, 1 = member overwrite. `allow`/`deny` are stringified bitfields.',
    '',
    '**Returns**: `{updated, channel_id, overwrite_id}`.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Channel whose overwrite is being set'),
    overwrite_id: Snowflake.describe('Role ID or user ID receiving the overwrite'),
    type: z
      .union([
        z.literal(PERMISSION_OVERWRITE_TYPE_VALUES[0]),
        z.literal(PERMISSION_OVERWRITE_TYPE_VALUES[1]),
      ])
      .describe('0 = role, 1 = member'),
    allow: z.string().optional().describe('Permission bitfield to allow (string of integer bits)'),
    deny: z.string().optional().describe('Permission bitfield to deny (string of integer bits)'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    updated: z.literal(true),
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
    const body: Record<string, unknown> = { type: args.type };
    if (args.allow !== undefined) body.allow = args.allow;
    if (args.deny !== undefined) body.deny = args.deny;
    await container.rest.put(Routes.channelPermission(args.channel_id, args.overwrite_id), {
      body,
      reason: args.audit_reason,
    });
    return dualResult({
      text: `Updated permission overwrite for \`${args.overwrite_id}\` on <#${args.channel_id}>.`,
      data: {
        updated: true as const,
        channel_id: args.channel_id,
        overwrite_id: args.overwrite_id,
      },
    });
  },
});
