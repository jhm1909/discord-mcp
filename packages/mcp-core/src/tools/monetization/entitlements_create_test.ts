import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, EntitlementId, SkuId, Snowflake } from '../_lib/snowflake.js';

interface RawEntitlement {
  id: string;
  sku_id: string;
  application_id: string;
  type: number;
}

export default defineTool({
  name: 'entitlements_create_test',
  category: 'monetization',
  description: [
    '**Purpose**: Create a test entitlement (dev tool). Lets devs simulate that a user/guild owns a SKU.',
    '',
    '**Returns**: `{id, sku_id, application_id, type}`.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Your application/bot ID'),
    sku_id: SkuId.describe('SKU to grant'),
    owner_id: Snowflake.describe('Guild ID (owner_type=1) or User ID (owner_type=2)'),
    owner_type: z.union([z.literal(1), z.literal(2)]).describe('1 = guild, 2 = user'),
  },
  outputSchema: {
    id: EntitlementId,
    sku_id: SkuId,
    application_id: ApplicationId,
    type: z.number().int(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body = {
      sku_id: args.sku_id,
      owner_id: args.owner_id,
      owner_type: args.owner_type,
    };
    const r = (await container.rest.post(Routes.entitlements(args.application_id), {
      body,
    })) as RawEntitlement;
    return dualResult({
      text: `Created test entitlement \`${r.id}\` for SKU \`${r.sku_id}\`.`,
      data: {
        id: r.id,
        sku_id: r.sku_id,
        application_id: r.application_id,
        type: r.type,
      },
    });
  },
});
