import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, SkuId } from '../_lib/snowflake.js';

interface RawSku {
  id: string;
  type: number;
  application_id: string;
  name: string;
  slug: string;
  flags: number;
}

export default defineTool({
  name: 'skus_list',
  category: 'monetization',
  description: [
    "**Purpose**: List your application's SKUs (premium offerings).",
    '',
    '**Returns**: `{skus:[{id, type, name, slug, flags}], count}`.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Your application/bot ID'),
  },
  outputSchema: {
    skus: z.array(
      z.object({
        id: SkuId,
        type: z.number().int(),
        name: z.string(),
        slug: z.string(),
        flags: z.number().int(),
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
    const raw = (await container.rest.get(Routes.skus(args.application_id))) as RawSku[];
    const skus = raw.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      slug: s.slug,
      flags: s.flags,
    }));
    return dualResult({
      text: `Found ${skus.length} SKU(s) for application \`${args.application_id}\`.`,
      data: { skus, count: skus.length },
    });
  },
});
