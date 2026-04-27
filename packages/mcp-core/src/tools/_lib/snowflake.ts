import { z } from 'zod';

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export const Snowflake = z
  .string()
  .regex(SNOWFLAKE_REGEX, 'Must be a 17-20 digit Discord snowflake');

export const ChannelId = Snowflake.brand<'ChannelId'>().describe('Discord channel ID (snowflake)');
export const GuildId = Snowflake.brand<'GuildId'>().describe('Discord guild (server) ID');
export const MessageId = Snowflake.brand<'MessageId'>().describe('Discord message ID');
export const UserId = Snowflake.brand<'UserId'>().describe('Discord user ID');
export const RoleId = Snowflake.brand<'RoleId'>().describe('Discord role ID');
export const ApplicationId = Snowflake.brand<'ApplicationId'>().describe('Discord application ID');
export const WebhookId = Snowflake.brand<'WebhookId'>().describe('Discord webhook ID');
export const EmojiId = Snowflake.brand<'EmojiId'>().describe('Discord custom emoji ID');

// Inferred branded types for compile-time safety:
export type ChannelId = z.infer<typeof ChannelId>;
export type GuildId = z.infer<typeof GuildId>;
export type MessageId = z.infer<typeof MessageId>;
export type UserId = z.infer<typeof UserId>;
export type RoleId = z.infer<typeof RoleId>;
