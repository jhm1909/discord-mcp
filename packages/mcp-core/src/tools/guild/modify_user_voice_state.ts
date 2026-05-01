import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, GuildId, UserId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'guild_modify_user_voice_state',
  category: 'guild',
  description: [
    "**Purpose**: Update another user's voice state in a stage channel (suppress = mute on stage).",
    '',
    '**When to use**:',
    '- Move audience users between stage and audience without giving them speak permission.',
    '',
    '**When NOT to use**:',
    "- Modify the bot's own state → use `guild_modify_current_voice_state`.",
    '',
    '**Returns**: `{ok, user_id, channel_id}`. Discord returns 204 (no body).',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild containing the stage channel'),
    user_id: UserId.describe('Target user'),
    channel_id: ChannelId.describe('Stage channel the user is currently in'),
    suppress: z
      .boolean()
      .optional()
      .describe('Whether the user is suppressed (true = audience, false = speaker)'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    ok: z.literal(true),
    user_id: UserId,
    channel_id: ChannelId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = { channel_id: args.channel_id };
    if (args.suppress !== undefined) body.suppress = args.suppress;
    await container.rest.patch(Routes.guildVoiceState(args.guild_id, args.user_id), {
      body,
      reason: args.audit_reason,
    });
    return dualResult({
      text: `Modified voice state for user \`${args.user_id}\` in channel \`${args.channel_id}\`.`,
      data: { ok: true as const, user_id: args.user_id, channel_id: args.channel_id },
    });
  },
});
