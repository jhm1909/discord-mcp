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
  name: 'subscriptions_get',
  category: 'monetization',
  description: [
    '**Purpose**: Fetch a single subscription on a SKU.',
    '',
    '**Returns**: subscription shape.',
  ].join('\n'),
  inputSchema: {
    sku_id: SkuId.describe('Parent SKU'),
    subscription_id: SubscriptionId.describe('Subscription to fetch'),
  },
  outputSchema: {
    id: SubscriptionId,
    user_id: UserId,
    sku_ids: z.array(SkuId),
    entitlement_ids: z.array(z.string()),
    current_period_start: z.string(),
    current_period_end: z.string(),
    status: z.number().int(),
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
      Routes.skuSubscription(args.sku_id, args.subscription_id),
    )) as RawSubscription;
    return dualResult({
      text: `Subscription \`${r.id}\` (status ${r.status}, ends ${r.current_period_end}).`,
      data: r,
    });
  },
});
