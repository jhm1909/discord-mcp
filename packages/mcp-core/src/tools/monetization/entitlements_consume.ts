import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, EntitlementId } from '../_lib/snowflake.js';

export default defineTool({
  name: 'entitlements_consume',
  category: 'monetization',
  description: [
    "**Purpose**: Mark a one-time entitlement as consumed (consumable SKU only). The user's purchase is recognized so they can buy again.",
    '',
    '**Returns**: `{consumed, application_id, entitlement_id}`.',
  ].join('\n'),
  inputSchema: {
    application_id: ApplicationId.describe('Your application/bot ID'),
    entitlement_id: EntitlementId.describe('Entitlement to consume'),
  },
  outputSchema: {
    consumed: z.literal(true),
    application_id: ApplicationId,
    entitlement_id: EntitlementId,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    await container.rest.post(Routes.consumeEntitlement(args.application_id, args.entitlement_id));
    return dualResult({
      text: `Consumed entitlement \`${args.entitlement_id}\`.`,
      data: {
        consumed: true as const,
        application_id: args.application_id,
        entitlement_id: args.entitlement_id,
      },
    });
  },
});
