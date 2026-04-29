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
  name: 'entitlements_list',
  category: 'monetization',
  description: [
    '**Purpose**: List entitlements for an application.',
    '',
    '**Returns**: `{entitlements:[...], count}`.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Your application/bot ID'),
    user_id: UserId.optional(),
    sku_ids: z.array(SkuId).optional(),
    before: EntitlementId.optional(),
    after: EntitlementId.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    guild_id: GuildId.optional(),
    exclude_ended: z.boolean().optional(),
    exclude_deleted: z.boolean().optional(),
  },
  outputSchema: {
    entitlements: z.array(
      z.object({
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
    const query = new URLSearchParams();
    if (args.user_id !== undefined) query.set('user_id', args.user_id);
    if (args.sku_ids !== undefined) query.set('sku_ids', args.sku_ids.join(','));
    if (args.before !== undefined) query.set('before', args.before);
    if (args.after !== undefined) query.set('after', args.after);
    if (args.limit !== undefined) query.set('limit', String(args.limit));
    if (args.guild_id !== undefined) query.set('guild_id', args.guild_id);
    if (args.exclude_ended !== undefined)
      query.set('exclude_ended', args.exclude_ended ? 'true' : 'false');
    if (args.exclude_deleted !== undefined)
      query.set('exclude_deleted', args.exclude_deleted ? 'true' : 'false');
    const raw = (await container.rest.get(Routes.entitlements(args.application_id), {
      query,
    })) as RawEntitlement[];
    return dualResult({
      text: `Found ${raw.length} entitlement(s) for application \`${args.application_id}\`.`,
      data: { entitlements: raw, count: raw.length },
    });
  },
});
