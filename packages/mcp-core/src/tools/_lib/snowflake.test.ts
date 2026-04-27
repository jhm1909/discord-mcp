import { describe, it, expect } from 'vitest';
import { Snowflake, ChannelId, GuildId, MessageId, UserId, RoleId } from './snowflake.js';

describe('Snowflake schemas', () => {
  it('accepts a 17-digit snowflake', () => {
    expect(Snowflake.safeParse('11223344556677889').success).toBe(true);
  });
  it('accepts a 20-digit snowflake', () => {
    expect(Snowflake.safeParse('11223344556677889900').success).toBe(true);
  });
  it('rejects a 16-digit string', () => {
    expect(Snowflake.safeParse('1122334455667788').success).toBe(false);
  });
  it('rejects a 21-digit string', () => {
    expect(Snowflake.safeParse('112233445566778899001').success).toBe(false);
  });
  it('rejects non-numeric content', () => {
    expect(Snowflake.safeParse('abc456789012345678').success).toBe(false);
  });
  it('exports branded ID variants with same shape', () => {
    for (const s of [ChannelId, GuildId, MessageId, UserId, RoleId]) {
      expect(s.safeParse('123456789012345678').success).toBe(true);
    }
  });
});
