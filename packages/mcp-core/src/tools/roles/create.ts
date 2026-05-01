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
  managed: boolean;
}

export default defineTool({
  name: 'roles_create',
  category: 'roles',
  description: [
    '**Purpose**: Create a new role in a guild.',
    '',
    '**When to use**:',
    '- Programmatic role provisioning (e.g. tier-based roles, integration roles).',
    '',
    '**`permissions`** is a base-10 STRING (Discord permission integer; bitfields exceed JS number safety).',
    '',
    '**Returns**: `{id, name, color, position, permissions, mentionable, hoist}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Target guild'),
    name: z.string().min(1).max(100).optional().describe('Role name (default "new role")'),
    permissions: PermissionString.optional().describe('Permission bitfield as base-10 string'),
    color: z.number().int().min(0).max(0xffffff).optional().describe('RGB color integer'),
    hoist: z
      .boolean()
      .optional()
      .describe('Display members with this role separately in the sidebar'),
    icon: z
      .string()
      .nullable()
      .optional()
      .describe('Role icon (data URI; requires guild boost level)'),
    unicode_emoji: z
      .string()
      .nullable()
      .optional()
      .describe('Role unicode emoji (requires ROLE_ICONS feature)'),
    mentionable: z.boolean().optional().describe('Whether @-mentioning the role notifies members'),
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
    idempotentHint: false,
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
    const r = (await container.rest.post(Routes.guildRoles(args.guild_id), {
      body,
      reason: args.audit_reason,
    })) as RawRole;
    return dualResult({
      text: `Created role **${r.name}** (\`role:${r.id}\`).`,
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
