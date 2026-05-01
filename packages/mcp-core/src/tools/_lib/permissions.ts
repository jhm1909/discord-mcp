import { z } from 'zod';

/**
 * Discord permission integer encoded as a base-10 string.
 *
 * Discord permission bitfields exceed `Number.MAX_SAFE_INTEGER`, so they MUST
 * be transmitted as strings. Use this brand for every `permissions`,
 * `allow`, `deny`, or `default_member_permissions` field in a tool schema.
 */
export const PermissionString = z
  .string()
  .regex(/^\d+$/, 'Discord permission integer encoded as base-10 string')
  .describe('Discord permission bitfield as a base-10 string (e.g. "8" = ADMINISTRATOR).');

export type PermissionString = z.infer<typeof PermissionString>;
