import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, GuildId } from '../_lib/snowflake.js';

interface RawWidgetSettings {
  enabled: boolean;
  channel_id: string | null;
}

export default defineTool({
  name: 'guild_modify_widget',
  category: 'guild',
  description: [
    '**Purpose**: Update widget settings (toggle enabled, set invite channel).',
    '',
    '**When to use**:',
    '- Toggle the public widget on/off, change which channel an embed-invite points at.',
    '',
    '**Returns**: `{enabled, channel_id}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to modify'),
    enabled: z.boolean().optional(),
    channel_id: ChannelId.nullable().optional(),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    enabled: z.boolean(),
    channel_id: ChannelId.nullable(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {};
    if (args.enabled !== undefined) body.enabled = args.enabled;
    if (args.channel_id !== undefined) body.channel_id = args.channel_id;
    const w = (await container.rest.patch(Routes.guildWidgetSettings(args.guild_id), {
      body,
      reason: args.audit_reason,
    })) as RawWidgetSettings;
    return dualResult({
      text: `Updated widget for \`${args.guild_id}\`: enabled=${w.enabled}, channel=${w.channel_id ?? 'none'}.`,
      data: { enabled: w.enabled, channel_id: w.channel_id },
    });
  },
});
