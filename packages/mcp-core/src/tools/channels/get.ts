import { z } from 'zod';
import { Routes } from 'discord-api-types/v10';
import { container } from '@sapphire/pieces';
import { defineTool } from '../_lib/defineTool.js';
import { ChannelId, GuildId } from '../_lib/snowflake.js';
import { dualResult } from '../_lib/response.js';
import { wrapUntrusted } from '../_lib/untrusted.js';

interface RawChannelDetail {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id: string | null;
  nsfw?: boolean;
  topic?: string | null;
  rate_limit_per_user?: number;
  guild_id?: string;
}

export default defineTool({
  name: 'channels_get',
  category: 'channels',
  description:
    '**Purpose**: Fetch full metadata for a single Discord channel.\n\n**When to use**: inspect topic, slowmode, nsfw of a known channel.\n\n**Returns**: `{id, name, type, position, parent_id, nsfw, topic, rate_limit_per_user, guild_id}`. `topic` wrapped in `<untrusted_discord_channel_topic>` (user-controlled).',
  inputSchema: {
    channel_id: ChannelId.describe('Target channel ID'),
  },
  outputSchema: {
    id: ChannelId,
    name: z.string(),
    type: z.number().int(),
    position: z.number().int(),
    parent_id: ChannelId.nullable(),
    nsfw: z.boolean(),
    topic: z.string().nullable(),
    rate_limit_per_user: z.number().int(),
    guild_id: GuildId.optional(),
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  idempotent: true,
  handler: async (args) => {
    const c = (await container.rest.get(Routes.channel(args.channel_id))) as RawChannelDetail;
    const topicWrapped =
      c.topic !== null && c.topic !== undefined ? wrapUntrusted(c.topic, 'channel_topic') : '_(no topic)_';
    const data: Record<string, unknown> = {
      id: c.id,
      name: c.name,
      type: c.type,
      position: c.position,
      parent_id: c.parent_id,
      nsfw: c.nsfw ?? false,
      topic: c.topic ?? null,
      rate_limit_per_user: c.rate_limit_per_user ?? 0,
    };
    if (c.guild_id !== undefined) data['guild_id'] = c.guild_id;
    return dualResult({
      text: `**#${c.name}** (\`channel:${c.id}\`, type ${c.type})\nTopic: ${topicWrapped}\nSlowmode: ${data['rate_limit_per_user']}s`,
      data,
    });
  },
});
