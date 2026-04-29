import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { GuildId } from '../_lib/snowflake.js';

interface RawRegion {
  id: string;
  name: string;
  optimal: boolean;
  deprecated: boolean;
  custom: boolean;
}

export default defineTool({
  name: 'guild_list_voice_regions',
  category: 'guild',
  description: [
    '**Purpose**: List voice regions available to a guild (incl. VIP regions).',
    '',
    '**When to use**:',
    '- Pick an `rtc_region` for a voice/stage channel.',
    '',
    '**Returns**: `{regions:[{id, name, optimal, deprecated, custom}], count}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to query'),
  },
  outputSchema: {
    regions: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        optimal: z.boolean(),
        deprecated: z.boolean(),
        custom: z.boolean(),
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
    const raw = (await container.rest.get(Routes.guildVoiceRegions(args.guild_id))) as RawRegion[];
    const regions = raw.map((r) => ({
      id: r.id,
      name: r.name,
      optimal: r.optimal,
      deprecated: r.deprecated,
      custom: r.custom,
    }));
    return dualResult({
      text: `**${regions.length} voice region(s)** for guild \`${args.guild_id}\`.`,
      data: { regions, count: regions.length },
    });
  },
});
