import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, EmojiId } from '../_lib/snowflake.js';

interface RawAppEmojiList {
  items: RawAppEmoji[];
}
interface RawAppEmoji {
  id: string | null;
  name: string | null;
  animated?: boolean;
}

export default defineTool({
  name: 'app_emojis_list',
  category: 'app_emojis',
  description: [
    '**Purpose**: List custom emojis registered against the application (per-app, not per-guild).',
    '',
    '**When to use**:',
    '- Inspect app-level emojis usable from any guild the bot is in.',
    '',
    '**When NOT to use**:',
    '- Guild-scoped emojis → use `emojis_list_guild`.',
    '',
    '**Returns**: `{emojis:[{id, name, animated}], count}`.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Application owning the emojis'),
  },
  outputSchema: {
    emojis: z.array(
      z.object({
        id: EmojiId.nullable(),
        name: z.string().nullable(),
        animated: z.boolean(),
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
    const raw = (await container.rest.get(
      Routes.applicationEmojis(args.application_id),
    )) as RawAppEmojiList;
    const items = raw.items ?? [];
    const emojis = items.map((e) => ({
      id: e.id,
      name: e.name,
      animated: e.animated ?? false,
    }));
    return dualResult({
      text: `**${emojis.length} application emoji(s)** for app \`${args.application_id}\`.`,
      data: { emojis, count: emojis.length },
    });
  },
});
