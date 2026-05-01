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
  name: 'commands_get_guild_command_permissions',
  category: 'commands',
  description:
    '**Purpose**: List per-command permission overrides for ALL commands in a guild.\n\n**Returns**: `{permissions:[{id, application_id, guild_id, permissions:[{id, type, permission}]}], count}`.',
  inputSchema: {
    application_id: ApplicationId.describe('Bot/app application ID'),
    guild_id: GuildId.describe('Guild scope'),
  },
  outputSchema: {
    permissions: z.array(
      z.object({
        id: z.string(),
        application_id: z.string(),
        guild_id: z.string(),
        permissions: z.array(
          z.object({ id: z.string(), type: z.number().int(), permission: z.boolean() }),
        ),
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
      Routes.guildApplicationCommandsPermissions(args.application_id, args.guild_id),
    )) as RawCommandPerms[];
    return dualResult({
      text: `Permissions configured for **${raw.length} command(s)** in guild \`${args.guild_id}\`.`,
      data: { permissions: raw, count: raw.length },
    });
  },
});
