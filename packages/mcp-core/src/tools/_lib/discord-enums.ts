/**
 * Discord enum value lists used by tool zod schemas. Centralized so each tool
 * can call `z.enum([...])` / `z.literal(N)` without re-deriving from
 * `discord-api-types`. Kept as `as const` tuples so zod retains literal types.
 */

export const CHANNEL_TYPE_VALUES = [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 16] as const;
export const PERMISSION_OVERWRITE_TYPE_VALUES = [0, 1] as const;

export const AUTOMOD_TRIGGER_TYPE_VALUES = [1, 3, 4, 5, 6] as const;
export const AUTOMOD_EVENT_TYPE_VALUES = [1, 2] as const;
export const AUTOMOD_ACTION_TYPE_VALUES = [1, 2, 3, 4] as const;

export const SCHEDULED_EVENT_PRIVACY_LEVEL = [2] as const; // GUILD_ONLY
export const SCHEDULED_EVENT_ENTITY_TYPE = [1, 2, 3] as const; // STAGE/VOICE/EXTERNAL
export const SCHEDULED_EVENT_STATUS = [1, 2, 3, 4] as const;

export const APPLICATION_COMMAND_TYPE = [1, 2, 3, 4] as const; // CHAT_INPUT/USER/MESSAGE/PRIMARY_ENTRY_POINT
export const APPLICATION_COMMAND_OPTION_TYPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export const INTERACTION_RESPONSE_TYPE = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const STICKER_FORMAT_TYPE = [1, 2, 3, 4] as const; // PNG/APNG/LOTTIE/GIF

export const FORUM_LAYOUT_TYPE = [0, 1, 2] as const;
export const SORT_ORDER_TYPE = [0, 1] as const;
export const VIDEO_QUALITY_MODE = [1, 2] as const;

export const REACTION_TYPE = [0, 1] as const; // 0 = normal, 1 = burst
export const THREAD_AUTO_ARCHIVE_DURATION = [60, 1440, 4320, 10080] as const;
