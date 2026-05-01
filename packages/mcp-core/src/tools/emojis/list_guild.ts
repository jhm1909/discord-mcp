import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { EmojiId, GuildId, RoleId } from '../_lib/snowflake.js';

interface RawEmoji {
  id: string | null;
  name: string | null;
  roles?: string[];
  animated?: boolean;
  available?: boolean;
}

export default defineTool({
  name: 'emojis_list_guild',
  category: 'emojis',
  description: [
    '**Purpose**: List all custom emojis defined in a guild.',
    '',
    '**When to use**:',
    '- Inventory custom emoji; pick one for a reaction or response.',
    '',
    '**When NOT to use**:',
    '- Application-scoped emojis → use `app_emojis_list`.',
    '',
    '**Returns**: `{emojis:[{id, name, animated, available, roles}], count}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to inspect'),
  },
  outputSchema: {
    emojis: z.array(
      z.object({
        id: EmojiId.nullable(),
        name: z.string().nullable(),
        animated: z.boolean(),
        available: z.boolean(),
        roles: z.array(RoleId),
      }),
    ),
    count: z.number().int(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const raw = (await container.rest.get(Routes.guildEmojis(args.guild_id))) as RawEmoji[];
    const emojis = raw.map((e) => ({
      id: e.id,
      name: e.name,
      animated: e.animated ?? false,
      available: e.available ?? true,
      roles: e.roles ?? [],
    }));
    return dualResult({
      text: `**${emojis.length} guild emoji(s)** in \`guild:${args.guild_id}\`.`,
      data: { emojis, count: emojis.length },
    });
  },
});
