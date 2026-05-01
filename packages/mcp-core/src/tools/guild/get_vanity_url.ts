import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { GuildId } from '../_lib/snowflake.js';

interface RawVanity {
  code: string | null;
  uses: number;
}

export default defineTool({
  name: 'guild_get_vanity_url',
  category: 'guild',
  description: [
    '**Purpose**: Get the guild vanity URL invite (Community/Partner perk).',
    '',
    '**When to use**:',
    '- Display the configured `discord.gg/<code>` shortcut and how many times it has been used.',
    '',
    '**Returns**: `{code, uses}`. `code` is null if no vanity URL is configured.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to query'),
  },
  outputSchema: {
    code: z.string().nullable(),
    uses: z.number().int(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const v = (await container.rest.get(Routes.guildVanityUrl(args.guild_id))) as RawVanity;
    return dualResult({
      text: `Vanity for \`${args.guild_id}\`: code=${v.code ?? '(none)'}, uses=${v.uses}.`,
      data: { code: v.code, uses: v.uses },
    });
  },
});
