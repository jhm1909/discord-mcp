import { container } from '@sapphire/pieces';
import { Routes } from 'discord-api-types/v10';
import { z } from 'zod';
import { defineTool } from '../_lib/defineTool.js';
import { dualResult } from '../_lib/response.js';
import { StickerId } from '../_lib/snowflake.js';

interface RawStickerPackList {
  sticker_packs: RawStickerPack[];
}
interface RawStickerPack {
  id: string;
  name: string;
  sku_id: string;
  cover_sticker_id?: string;
  description: string;
  banner_asset_id?: string;
  stickers: Array<{ id: string; name: string }>;
}

export default defineTool({
  name: 'stickers_list_packs',
  category: 'stickers',
  description: [
    '**Purpose**: List Nitro sticker packs available globally.',
    '',
    '**When to use**:',
    '- Discover available default sticker packs.',
    '',
    '**Returns**: `{packs:[{id, name, description, stickers:[{id, name}]}], count}`.',
  ].join('\n'),
  inputSchema: {},
  outputSchema: {
    packs: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        stickers: z.array(z.object({ id: StickerId, name: z.string() })),
      }),
    ),
    count: z.number().int(),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  idempotent: true,
  handler: async () => {
    const raw = (await container.rest.get(Routes.stickerPacks())) as RawStickerPackList;
    const packs = raw.sticker_packs.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      stickers: p.stickers.map((s) => ({ id: s.id, name: s.name })),
    }));
    return dualResult({
      text: `**${packs.length} sticker pack(s)** available.`,
      data: { packs, count: packs.length },
    });
  },
});
