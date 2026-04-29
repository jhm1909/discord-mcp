import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { GuildId, IntegrationId } from '../_lib/snowflake.js';

interface RawIntegration {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  account?: { id: string; name: string };
}

export default defineTool({
  name: 'guild_list_integrations',
  category: 'guild',
  description: [
    '**Purpose**: List integrations attached to a guild (Twitch, YouTube, application bots, etc.).',
    '',
    '**When to use**:',
    '- Audit which third-party integrations exist before deletion.',
    '',
    '**Returns**: `{integrations:[{id, name, type, enabled, account}], count}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild to query'),
  },
  outputSchema: {
    integrations: z.array(
      z.object({
        id: IntegrationId,
        name: z.string(),
        type: z.string(),
        enabled: z.boolean(),
        account: z.object({ id: z.string(), name: z.string() }).optional(),
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
    const raw = (await container.rest.get(
      Routes.guildIntegrations(args.guild_id),
    )) as RawIntegration[];
    const integrations = raw.map((i) => ({
      id: i.id,
      name: i.name,
      type: i.type,
      enabled: i.enabled,
      account: i.account,
    }));
    return dualResult({
      text: `**${integrations.length} integration(s)** in guild \`${args.guild_id}\`.`,
      data: { integrations, count: integrations.length },
    });
  },
});
