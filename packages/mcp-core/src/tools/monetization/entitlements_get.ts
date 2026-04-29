import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, EntitlementId, GuildId, SkuId, UserId } from '../_lib/snowflake.js';

interface RawEntitlement {
  id: string;
  sku_id: string;
  application_id: string;
  user_id?: string;
  type: number;
  deleted: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  guild_id?: string | null;
  consumed?: boolean;
}

export default defineTool({
  name: 'entitlements_get',
  category: 'monetization',
  description: [
    '**Purpose**: Fetch a single entitlement.',
    '',
    '**Returns**: entitlement shape.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Your application/bot ID'),
    entitlement_id: EntitlementId.describe('Entitlement to fetch'),
  },
  outputSchema: {
    id: EntitlementId,
    sku_id: SkuId,
    application_id: ApplicationId,
    user_id: UserId.optional(),
    type: z.number().int(),
    deleted: z.boolean(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    guild_id: GuildId.nullable().optional(),
    consumed: z.boolean().optional(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const r = (await container.rest.get(
      Routes.entitlement(args.application_id, args.entitlement_id),
    )) as RawEntitlement;
    return dualResult({
      text: `Entitlement \`${r.id}\` (type ${r.type}, deleted=${r.deleted}).`,
      data: r,
    });
  },
});
