import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, GuildId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'guild_modify_current_voice_state',
  category: 'guild',
  description: [
    "**Purpose**: Update the bot's own voice state in a stage channel (request to speak, toggle suppress).",
    '',
    '**When to use**:',
    '- Bot wants to raise its hand (`request_to_speak_timestamp = now`) or step down (suppress = true).',
    '',
    '**Returns**: `{ok, guild_id}`. Discord returns 204 (no body).',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild containing the stage channel'),
    channel_id: ChannelId.optional().describe('Stage channel the bot is currently in'),
    suppress: z.boolean().optional(),
    request_to_speak_timestamp: z
      .string()
      .nullable()
      .optional()
      .describe('ISO8601 timestamp; null clears, future requests to speak'),
  },
  outputSchema: {
    ok: z.literal(true),
    guild_id: GuildId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {};
    if (args.channel_id !== undefined) body.channel_id = args.channel_id;
    if (args.suppress !== undefined) body.suppress = args.suppress;
    if (args.request_to_speak_timestamp !== undefined)
      body.request_to_speak_timestamp = args.request_to_speak_timestamp;
    await container.rest.patch(Routes.guildVoiceState(args.guild_id, '@me'), { body });
    return dualResult({
      text: `Modified own voice state in guild \`${args.guild_id}\`.`,
      data: { ok: true as const, guild_id: args.guild_id },
    });
  },
});
