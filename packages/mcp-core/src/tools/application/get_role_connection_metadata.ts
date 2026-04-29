import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId } from '../_lib/snowflake.js';

interface RawRoleConnectionMetadata {
  key: string;
  name: string;
  name_localizations?: Record<string, string> | null;
  description: string;
  description_localizations?: Record<string, string> | null;
  type: number;
}

export default defineTool({
  name: 'application_get_role_connection_metadata',
  category: 'application',
  description:
    '**Purpose**: List the application role-connection metadata records (used for "linked roles" criteria).\n\n**Returns**: `{records, count}` where `record.type` ∈ 1..8 (INTEGER_LESS_THAN_OR_EQUAL=1, …, BOOLEAN_NOT_EQUAL=8).',
  inputSchema: {
    application_id: ApplicationId.describe('Bot/app application ID'),
  },
  outputSchema: {
    records: z.array(
      z.object({
        key: z.string(),
        name: z.string(),
        description: z.string(),
        type: z.number().int().min(1).max(8),
      }),
    ),
    count: z.number(),
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
      Routes.applicationRoleConnectionMetadata(args.application_id),
    )) as RawRoleConnectionMetadata[];
    const records = raw.map((r) => ({
      key: r.key,
      name: r.name,
      description: r.description,
      type: r.type,
    }));
    return dualResult({
      text: `**${records.length} role-connection metadata record(s)** registered.`,
      data: { records, count: records.length },
    });
  },
});
