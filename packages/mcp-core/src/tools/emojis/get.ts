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
  name: 'emojis_get',
  category: 'emojis',
  description: [
    '**Purpose**: Fetch a single guild emoji by ID.',
    '',
    '**When to use**:',
    '- Verify an emoji exists; inspect role-restriction list.',
    '',
    '**Returns**: `{id, name, animated, available, roles}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild owning the emoji'),
    emoji_id: EmojiId.describe('Emoji to fetch'),
  },
  outputSchema: {
    id: EmojiId.nullable(),
    name: z.string().nullable(),
    animated: z.boolean(),
    available: z.boolean(),
    roles: z.array(RoleId),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const e = (await container.rest.get(
      Routes.guildEmoji(args.guild_id, args.emoji_id),
    )) as RawEmoji;
    return dualResult({
      text: `Emoji ${e.name ?? '(unnamed)'} (\`${e.id ?? 'null'}\`)`,
      data: {
        id: e.id,
        name: e.name,
        animated: e.animated ?? false,
        available: e.available ?? true,
        roles: e.roles ?? [],
      },
    });
  },
});
