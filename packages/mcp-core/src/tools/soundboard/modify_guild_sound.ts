import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { EmojiId, GuildId, SoundboardSoundId } from '../_lib/snowflake.js';

interface RawSound {
  sound_id: string;
  name: string;
  volume: number;
  emoji_id: string | null;
  emoji_name: string | null;
}

export default defineTool({
  name: 'soundboard_modify_guild_sound',
  category: 'soundboard',
  description: [
    "**Purpose**: Modify a guild soundboard sound's metadata. Pass only fields you want to change.",
    '',
    '**Returns**: updated `{sound_id, name, volume, emoji_id, emoji_name}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild containing the sound'),
    sound_id: SoundboardSoundId.describe('Sound to modify'),
    name: z.string().min(2).max(32).optional(),
    volume: z.number().min(0).max(1).nullable().optional(),
    emoji_id: EmojiId.nullable().optional(),
    emoji_name: z.string().nullable().optional(),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    sound_id: SoundboardSoundId,
    name: z.string(),
    volume: z.number(),
    emoji_id: z.string().nullable(),
    emoji_name: z.string().nullable(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.volume !== undefined) body.volume = args.volume;
    if (args.emoji_id !== undefined) body.emoji_id = args.emoji_id;
    if (args.emoji_name !== undefined) body.emoji_name = args.emoji_name;
    const r = (await container.rest.patch(
      Routes.guildSoundboardSound(args.guild_id, args.sound_id),
      { body, reason: args.audit_reason },
    )) as RawSound;
    return dualResult({
      text: `Modified soundboard sound \`${r.sound_id}\`.`,
      data: {
        sound_id: r.sound_id,
        name: r.name,
        volume: r.volume,
        emoji_id: r.emoji_id,
        emoji_name: r.emoji_name,
      },
    });
  },
});
