import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { AutoModRuleId, ChannelId, GuildId, RoleId } from '../_lib/snowflake.js';
import {
  AutoModAction,
  AutoModEventType,
  AutoModTriggerMetadata,
  AutoModTriggerType,
} from './_lib.js';

interface RawRule {
  id: string;
  name: string;
  trigger_type: number;
  enabled: boolean;
}

export default defineTool({
  name: 'automod_create_rule',
  category: 'automod',
  description: [
    '**Purpose**: Create an AutoMod rule.',
    '',
    '**When to use**:',
    '- Add a keyword filter, spam blocker, mention-raid guard, etc.',
    '',
    '**`trigger_metadata`** is conditional on `trigger_type`:',
    '- 1 KEYWORD → keyword_filter, regex_patterns, allow_list',
    '- 3 SPAM → no metadata',
    '- 4 KEYWORD_PRESET → presets, allow_list',
    '- 5 MENTION_SPAM → mention_total_limit, mention_raid_protection_enabled',
    '- 6 MEMBER_PROFILE → keyword_filter, regex_patterns, allow_list',
    '',
    '**Returns**: `{id, name, trigger_type, enabled}`.',
  ].join('\n'),
  inputSchema: {
    guild_id: GuildId.describe('Target guild'),
    name: z.string().min(1).max(100).describe('Rule name'),
    event_type: AutoModEventType,
    trigger_type: AutoModTriggerType,
    trigger_metadata: AutoModTriggerMetadata.optional(),
    actions: z.array(AutoModAction).min(1).describe('Actions to take when the rule fires'),
    enabled: z.boolean().optional().describe('Whether the rule is active (default true)'),
    exempt_roles: z
      .array(RoleId)
      .max(20)
      .optional()
      .describe('Roles exempt from this rule (max 20)'),
    exempt_channels: z
      .array(ChannelId)
      .max(50)
      .optional()
      .describe('Channels exempt from this rule (max 50)'),
    audit_reason: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Reason recorded in audit log (X-Audit-Log-Reason header)'),
  },
  outputSchema: {
    id: AutoModRuleId,
    name: z.string(),
    trigger_type: z.number().int(),
    enabled: z.boolean(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const body: Record<string, unknown> = {
      name: args.name,
      event_type: args.event_type,
      trigger_type: args.trigger_type,
      actions: args.actions,
    };
    if (args.trigger_metadata !== undefined) body.trigger_metadata = args.trigger_metadata;
    if (args.enabled !== undefined) body.enabled = args.enabled;
    if (args.exempt_roles !== undefined) body.exempt_roles = args.exempt_roles;
    if (args.exempt_channels !== undefined) body.exempt_channels = args.exempt_channels;
    const r = (await container.rest.post(Routes.guildAutoModerationRules(args.guild_id), {
      body,
      reason: args.audit_reason,
    })) as RawRule;
    return dualResult({
      text: `Created AutoMod rule \`${r.id}\` (trigger_type ${r.trigger_type}, enabled=${r.enabled}).`,
      data: { id: r.id, name: r.name, trigger_type: r.trigger_type, enabled: r.enabled },
    });
  },
});
