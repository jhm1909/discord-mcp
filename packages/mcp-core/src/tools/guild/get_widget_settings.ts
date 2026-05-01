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
  name: 'guild_get_widget_settings',
  category: 'guild',
  description: [
    '**Purpose**: Get widget settings for a guild (admin view).',
    '',
    '**When to use**:',
    '- Inspect whether the widget is enabled and to which invite channel it points.',
    '',
    '**When NOT to use**:',
    '- Public widget data → use `guild_get_widget`.',
    '',
    '**Returns**: `{enabled, channel_id}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to query'),
  },
  outputSchema: {
    enabled: z.boolean(),
    channel_id: ChannelId.nullable(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const w = (await container.rest.get(
      Routes.guildWidgetSettings(args.guild_id),
    )) as RawWidgetSettings;
    return dualResult({
      text: `Widget for \`${args.guild_id}\`: enabled=${w.enabled}, channel=${w.channel_id ?? 'none'}.`,
      data: { enabled: w.enabled, channel_id: w.channel_id },
    });
  },
});
