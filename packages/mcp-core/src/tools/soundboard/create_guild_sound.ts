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

const SOUND_DATA_URI_RE = /^data:audio\/(mpeg|ogg|wav);base64,[A-Za-z0-9+/=]+$/;

export default defineTool({
  name: 'soundboard_create_guild_sound',
  category: 'soundboard',
  description: [
    '**Purpose**: Upload a new soundboard sound to a guild.',
    '',
    '**`sound`** must be a base64 data URI (audio/mpeg|ogg|wav), max 512 KB raw.',
    '',
    '**Returns**: `{sound_id, name, volume, emoji_id, emoji_name}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Target guild'),
    name: z.string().min(2).max(32).describe('Sound name (2..32 chars)'),
    sound: z
      .string()
      .regex(
        SOUND_DATA_URI_RE,
        'Must be a data:audio/{mpeg|ogg|wav};base64,... data URI under 512KB',
      )
      .describe('Base64-encoded audio data URI (mp3/ogg/wav)'),
    volume: z.number().min(0).max(1).optional().describe('Playback volume 0..1 (default 1)'),
    emoji_id: EmojiId.optional().describe('Custom emoji to display'),
    emoji_name: z.string().optional().describe('Unicode emoji to display'),
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
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {
      name: args.name,
      sound: args.sound,
    };
    if (args.volume !== undefined) body.volume = args.volume;
    if (args.emoji_id !== undefined) body.emoji_id = args.emoji_id;
    if (args.emoji_name !== undefined) body.emoji_name = args.emoji_name;
    const r = (await container.rest.post(Routes.guildSoundboardSounds(args.guild_id), {
      body,
      reason: args.audit_reason,
    })) as RawSound;
    return dualResult({
      text: `Created soundboard sound \`${r.sound_id}\` (${r.name}).`,
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
