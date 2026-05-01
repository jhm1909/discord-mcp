import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ApplicationId, ChannelId, InviteCode, UserId } from '../_lib/snowflake.js';

interface RawInvite {
  code: string;
  expires_at?: string | null;
  max_age?: number;
  max_uses?: number;
  temporary?: boolean;
  unique?: boolean;
  inviter?: { id: string; username: string };
}

export default defineTool({
  name: 'invites_create_channel',
  category: 'invites',
  description: [
    '**Purpose**: Create a new invite for a channel.',
    '',
    '**When to use**:',
    '- Issue a fresh invite with custom expiry / use cap.',
    '- Generate a stream-target invite (`target_type=1, target_user_id=…`).',
    '',
    '**When NOT to use**:',
    '- Reuse an existing invite → `invites_list_channel` then pick one.',
    '',
    '**Example**: `{channel_id:"112233445566778899", max_age:86400, max_uses:5, unique:true}`',
    '',
    '**Returns**: `{code, expires_at, max_age, max_uses, temporary, unique, inviter_id}`.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Channel to create the invite for'),
    max_age: z
      .number()
      .int()
      .min(0)
      .max(604800)
      .optional()
      .describe('Seconds until expiry (0 = never). Default 86400.'),
    max_uses: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .describe('Max uses (0 = unlimited). Default 0.'),
    temporary: z
      .boolean()
      .optional()
      .describe('If true, kicks members who do not get assigned a role. Default false.'),
    unique: z
      .boolean()
      .optional()
      .describe('Force a brand-new invite even if one with same parameters exists.'),
    target_type: z
      .number()
      .int()
      .min(1)
      .max(2)
      .optional()
      .describe('1 = STREAM, 2 = EMBEDDED_APPLICATION'),
    target_user_id: UserId.optional().describe('User whose stream to target (target_type=1)'),
    target_application_id: ApplicationId.optional().describe(
      'Embedded application to target (target_type=2)',
    ),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    code: InviteCode,
    expires_at: z.string().nullable().optional(),
    max_age: z.number().optional(),
    max_uses: z.number().optional(),
    temporary: z.boolean().optional(),
    unique: z.boolean().optional(),
    inviter_id: UserId.optional(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {};
    if (args.max_age !== undefined) body.max_age = args.max_age;
    if (args.max_uses !== undefined) body.max_uses = args.max_uses;
    if (args.temporary !== undefined) body.temporary = args.temporary;
    if (args.unique !== undefined) body.unique = args.unique;
    if (args.target_type !== undefined) body.target_type = args.target_type;
    if (args.target_user_id !== undefined) body.target_user_id = args.target_user_id;
    if (args.target_application_id !== undefined)
      body.target_application_id = args.target_application_id;
    const inv = (await container.rest.post(Routes.channelInvites(args.channel_id), {
      body,
      reason: args.audit_reason,
    })) as RawInvite;
    return dualResult({
      text: `Created invite \`${inv.code}\` for <#${args.channel_id}>.`,
      data: {
        code: inv.code,
        expires_at: inv.expires_at,
        max_age: inv.max_age,
        max_uses: inv.max_uses,
        temporary: inv.temporary,
        unique: inv.unique,
        inviter_id: inv.inviter?.id,
      },
    });
  },
});
