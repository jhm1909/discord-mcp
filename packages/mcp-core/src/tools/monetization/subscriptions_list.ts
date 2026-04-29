import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { SkuId, SubscriptionId, UserId } from '../_lib/snowflake.js';

interface RawSubscription {
  id: string;
  user_id: string;
  sku_ids: string[];
  entitlement_ids: string[];
  current_period_start: string;
  current_period_end: string;
  status: number;
}

export default defineTool({
  name: 'subscriptions_list',
  category: 'monetization',
  description: [
    '**Purpose**: List subscriptions for a SKU.',
    '',
    '**Returns**: `{subscriptions:[...], count}`.',
  ].join('\n'),
  inputSchema: {
    sku_id: SkuId.describe('SKU to list subscriptions for'),
    before: SubscriptionId.optional(),
    after: SubscriptionId.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    user_id: UserId.optional(),
  },
  outputSchema: {
    subscriptions: z.array(
      z.object({
        id: SubscriptionId,
        user_id: UserId,
        sku_ids: z.array(SkuId),
        entitlement_ids: z.array(z.string()),
        current_period_start: z.string(),
        current_period_end: z.string(),
        status: z.number().int(),
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
    if (args.before !== undefined) query.set('before', args.before);
    if (args.after !== undefined) query.set('after', args.after);
    if (args.limit !== undefined) query.set('limit', String(args.limit));
    if (args.user_id !== undefined) query.set('user_id', args.user_id);
    const raw = (await container.rest.get(Routes.skuSubscriptions(args.sku_id), {
      query,
    })) as RawSubscription[];
    return dualResult({
      text: `Found ${raw.length} subscription(s) for SKU \`${args.sku_id}\`.`,
      data: { subscriptions: raw, count: raw.length },
    });
  },
});
