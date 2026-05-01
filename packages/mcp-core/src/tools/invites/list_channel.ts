import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { ChannelId, InviteCode, UserId } from '../_lib/snowflake.js';

interface RawInvite {
  code: string;
  uses?: number;
  max_uses?: number;
  max_age?: number;
  temporary?: boolean;
  created_at?: string;
  expires_at?: string | null;
  inviter?: { id: string; username: string; global_name?: string | null };
  channel?: { id: string };
}

export default defineTool({
  name: 'invites_list_channel',
  category: 'invites',
  description: [
    '**Purpose**: List active invites for a single channel.',
    '',
    '**When to use**:',
    '- Audit who created which invites and how often each is used.',
    '- Find candidates for `invites_delete` cleanup.',
    '',
    '**When NOT to use**:',
    '- All invites across a guild → use `guild_list_invites` (Plan 7 Phase D).',
    '',
    '**Returns**: `{invites: [{code, uses, max_uses, max_age, expires_at, inviter_id, inviter_name, temporary}]}`.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Channel to list invites for'),
  },
  outputSchema: {
    invites: z.array(
      z.object({
        code: InviteCode,
        uses: z.number().optional(),
        max_uses: z.number().optional(),
        max_age: z.number().optional(),
        temporary: z.boolean().optional(),
        created_at: z.string().optional(),
        expires_at: z.string().nullable().optional(),
        inviter_id: UserId.optional(),
        inviter_name: z.string().optional(),
      }),
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
    const list = (await container.rest.get(Routes.channelInvites(args.channel_id))) as RawInvite[];
    const invites = list.map((inv) => ({
      code: inv.code,
      uses: inv.uses,
      max_uses: inv.max_uses,
      max_age: inv.max_age,
      temporary: inv.temporary,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      inviter_id: inv.inviter?.id,
      inviter_name: inv.inviter?.global_name ?? inv.inviter?.username,
    }));
    return dualResult({
      text: `Found ${invites.length} invite(s) in <#${args.channel_id}>.`,
      data: { invites },
    });
  },
});
