import { z } from 'zod';
import {
  AUTOMOD_ACTION_TYPE_VALUES,
  AUTOMOD_EVENT_TYPE_VALUES,
  AUTOMOD_TRIGGER_TYPE_VALUES,
} from '../_lib/discord-enums.js';
import { ChannelId } from '../_lib/snowflake.js';

export const AutoModEventType = z
  .number()
  .int()
  .refine(
    (v): v is (typeof AUTOMOD_EVENT_TYPE_VALUES)[number] =>
      (AUTOMOD_EVENT_TYPE_VALUES as readonly number[]).includes(v),
    `event_type must be one of: ${AUTOMOD_EVENT_TYPE_VALUES.join(', ')}`,
  )
  .describe('AutoMod event type (1 MESSAGE_SEND, 2 MEMBER_UPDATE)');

export const AutoModTriggerType = z
  .number()
  .int()
  .refine(
    (v): v is (typeof AUTOMOD_TRIGGER_TYPE_VALUES)[number] =>
      (AUTOMOD_TRIGGER_TYPE_VALUES as readonly number[]).includes(v),
    `trigger_type must be one of: ${AUTOMOD_TRIGGER_TYPE_VALUES.join(', ')}`,
  )
  .describe(
    'AutoMod trigger type (1 KEYWORD, 3 SPAM, 4 KEYWORD_PRESET, 5 MENTION_SPAM, 6 MEMBER_PROFILE)',
  );

export const AutoModActionType = z
  .number()
  .int()
  .refine(
    (v): v is (typeof AUTOMOD_ACTION_TYPE_VALUES)[number] =>
      (AUTOMOD_ACTION_TYPE_VALUES as readonly number[]).includes(v),
    `action.type must be one of: ${AUTOMOD_ACTION_TYPE_VALUES.join(', ')}`,
  );

export const AutoModAction = z
  .object({
    type: AutoModActionType.describe(
      'Action type (1 BLOCK_MESSAGE, 2 SEND_ALERT_MESSAGE, 3 TIMEOUT, 4 BLOCK_MEMBER_INTERACTION)',
    ),
    metadata: z
      .object({
        channel_id: ChannelId.optional().describe('Alert channel (action type 2)'),
        duration_seconds: z
          .number()
          .int()
          .min(0)
          .max(2419200)
          .optional()
          .describe('Timeout duration (action type 3, max 28 days)'),
        custom_message: z
          .string()
          .max(150)
          .optional()
          .describe('Custom message shown when blocking (action type 1)'),
      })
      .optional(),
  })
  .describe('AutoMod action descriptor');

export const AutoModTriggerMetadata = z
  .object({
    keyword_filter: z.array(z.string()).optional().describe('KEYWORD/MEMBER_PROFILE: word list'),
    regex_patterns: z
      .array(z.string())
      .optional()
      .describe('KEYWORD/MEMBER_PROFILE: regex pattern list (max 10)'),
    presets: z
      .array(z.union([z.literal(1), z.literal(2), z.literal(3)]))
      .optional()
      .describe('KEYWORD_PRESET: preset list (1 PROFANITY, 2 SEXUAL_CONTENT, 3 SLURS)'),
    allow_list: z.array(z.string()).optional().describe('Substrings exempted from triggering'),
    mention_total_limit: z
      .number()
      .int()
      .min(0)
      .max(50)
      .optional()
      .describe('MENTION_SPAM: max mentions per message'),
    mention_raid_protection_enabled: z
      .boolean()
      .optional()
      .describe('MENTION_SPAM: enable raid protection'),
  })
  .describe('AutoMod trigger metadata (fields valid per trigger_type)');
