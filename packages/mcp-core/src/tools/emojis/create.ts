import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { EmojiId, GuildId, RoleId } from '../_lib/snowflake.js';

interface RawEmoji {
  id: string | null;
  name: string | null;
  animated?: boolean;
  available?: boolean;
  roles?: string[];
}

export default defineTool({
  name: 'emojis_create',
  category: 'emojis',
  description: [
    '**Purpose**: Upload a new custom emoji to a guild.',
    '',
    '**When to use**:',
    '- Programmatic onboarding of brand emojis.',
    '',
    '**When NOT to use**:',
    '- Application-wide emojis → use `app_emojis_create`.',
    '- Image > 256KB before base64 → Discord rejects.',
    '',
    '**Example**: `{guild_id:"…", name:"sparkle", image:"data:image/png;base64,iVBOR…"}`',
    '',
    '**Returns**: `{id, name, animated, roles}`. Image MUST be a base64 data URI.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Target guild'),
    name: z
      .string()
      .min(2, 'name must be 2-32 chars')
      .max(32, 'name must be 2-32 chars')
      .describe('Emoji name (2-32 chars)'),
    image: z
      .string()
      .min(1)
      .describe('Emoji image as a base64 data URI (e.g. "data:image/png;base64,…")'),
    roles: z
      .array(RoleId)
      .optional()
      .describe('Roles allowed to use this emoji (omit for everyone)'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    id: EmojiId.nullable(),
    name: z.string().nullable(),
    animated: z.boolean(),
    roles: z.array(RoleId),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = { name: args.name, image: args.image };
    if (args.roles !== undefined) body.roles = args.roles;
    const e = (await container.rest.post(Routes.guildEmojis(args.guild_id), {
      body,
      reason: args.audit_reason,
    })) as RawEmoji;
    return dualResult({
      text: `Created emoji ${e.name ?? '(unnamed)'} (\`${e.id ?? 'null'}\`).`,
      data: {
        id: e.id,
        name: e.name,
        animated: e.animated ?? false,
        roles: e.roles ?? [],
      },
    });
  },
});
