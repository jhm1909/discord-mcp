import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';

interface RawRegion {
  id: string;
  name: string;
  optimal: boolean;
  deprecated: boolean;
  custom: boolean;
}

export default defineTool({
  name: 'voice_list_regions',
  category: 'voice',
  description: [
    '**Purpose**: List all global voice regions usable for voice/stage channels.',
    '',
    '**Returns**: `{regions:[{id, name, optimal, deprecated, custom}], count}`.',
  ].join('\n'),
  inputSchema: {},
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
  handler: async () => {
    const raw = (await container.rest.get(Routes.voiceRegions())) as RawRegion[];
    const regions = raw.map((r) => ({
      id: r.id,
      name: r.name,
      optimal: r.optimal,
      deprecated: r.deprecated,
      custom: r.custom,
    }));
    return dualResult({
      text: `Found ${regions.length} voice region(s).`,
      data: { regions, count: regions.length },
    });
  },
});
