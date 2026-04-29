import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { PermissionString } from '../_lib/permissions.js';
import { dualResult } from '../_lib/response.js';
import { GuildId, RoleId } from '../_lib/snowflake.js';

interface RawRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  mentionable: boolean;
  hoist: boolean;
}

export default defineTool({
  name: 'roles_modify',
  category: 'roles',
  description: [
    "**Purpose**: Update a role's properties. Pass only fields you want to change.",
    '',
    '**When to use**:',
    '- Rename, recolor, change permissions, toggle mentionability/hoist, set role icon.',
    '',
    '**When NOT to use**:',
    '- Reorder roles → use `roles_modify_positions`.',
    '- Delete → use `roles_delete`.',
    '',
    '**`permissions`** is a base-10 STRING (Discord permission bitfield).',
    '',
    '**Returns**: `{id, name, color, position, permissions, mentionable, hoist}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Guild containing the role'),
    role_id: RoleId.describe('Role to modify'),
    name: z.string().min(1).max(100).nullable().optional(),
    permissions: PermissionString.optional().describe('Permission bitfield as base-10 string'),
    color: z.number().int().min(0).max(0xffffff).nullable().optional(),
    hoist: z.boolean().nullable().optional(),
    icon: z.string().nullable().optional(),
    unicode_emoji: z.string().nullable().optional(),
    mentionable: z.boolean().nullable().optional(),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    id: RoleId,
    name: z.string(),
    color: z.number().int(),
    position: z.number().int(),
    permissions: z.string(),
    mentionable: z.boolean(),
    hoist: z.boolean(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {};
    const passthrough = [
      'name',
      'permissions',
      'color',
      'hoist',
      'icon',
      'unicode_emoji',
      'mentionable',
    ] as const;
    for (const key of passthrough) {
      const v = (args as Record<string, unknown>)[key];
      if (v !== undefined) body[key] = v;
    }
    const r = (await container.rest.patch(Routes.guildRole(args.guild_id, args.role_id), {
      body,
      reason: args.audit_reason,
    })) as RawRole;
    return dualResult({
      text: `Modified role **${r.name}** (\`role:${r.id}\`).`,
      data: {
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
        permissions: r.permissions,
        mentionable: r.mentionable,
        hoist: r.hoist,
      },
    });
  },
});
