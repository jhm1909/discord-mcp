import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, GuildId } from '../_lib/snowflake.js';

interface RawCommandPerms {
  id: string;
  application_id: string;
  guild_id: string;
  permissions: Array<{ id: string; type: number; permission: boolean }>;
}

export default defineTool({
  name: 'commands_get_command_permissions',
  category: 'commands',
  description:
    '**Purpose**: Get permission overrides for ONE specific command in a guild.\n\n**Returns**: `{id, application_id, guild_id, permissions:[{id, type, permission}]}`.',
  inputSchema: {
    application_id: ApplicationId.describe('Bot/app application ID'),
    guild_id: GuildId.describe('Guild scope'),
    command_id: z
      .string()
      .regex(/^\d{17,20}$/)
      .describe('Command ID (snowflake)'),
  },
  outputSchema: {
    id: z.string(),
    application_id: z.string(),
    guild_id: z.string(),
    permissions: z.array(
      z.object({ id: z.string(), type: z.number().int(), permission: z.boolean() }),
    ),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async (args) => {
    const p = (await container.rest.get(
      Routes.applicationCommandPermissions(args.application_id, args.guild_id, args.command_id),
    )) as RawCommandPerms;
    return dualResult({
      text: `Command \`${p.id}\` has ${p.permissions.length} permission override(s).`,
      data: p,
    });
  },
});
