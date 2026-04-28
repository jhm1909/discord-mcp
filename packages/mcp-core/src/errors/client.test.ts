import { describe, it, expect } from 'vitest';
import {
  DiscordPermissionError,
  DiscordRateLimitError,
  DiscordNotFoundError,
} from './client.js';

describe('DiscordPermissionError', () => {
  it('captures missing + have permissions and resource', () => {
    const e = new DiscordPermissionError(
      ['MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'],
      ['SEND_MESSAGES'],
      'channel:1234',
    );
    expect(e.code).toBe('DISCORD_PERMISSION_DENIED');
    expect(e.retriable).toBe(false);
    expect(e.missing).toEqual(['MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY']);
    expect(e.have).toEqual(['SEND_MESSAGES']);
    expect(e.resource).toBe('channel:1234');
    expect(e.recoveryHint).toContain('MANAGE_MESSAGES');
  });
});

describe('DiscordRateLimitError', () => {
  it('captures retry-after, bucket, scope; sets recoveryHint', () => {
    const e = new DiscordRateLimitError(2400, 'POST /channels/X/messages', 'user');
    expect(e.code).toBe('DISCORD_RATE_LIMITED');
    expect(e.retriable).toBe(true);
    expect(e.retryAfterMs).toBe(2400);
    expect(e.bucket).toBe('POST /channels/X/messages');
    expect(e.scope).toBe('user');
    expect(e.recoveryHint).toContain('2400ms');
  });

  it('appends suggested_tool to recoveryHint when provided', () => {
    const e = new DiscordRateLimitError(500, 'b', 'shared', 'messages_bulk_send');
    expect(e.suggestedTool).toBe('messages_bulk_send');
    expect(e.recoveryHint).toContain('messages_bulk_send');
  });
});

describe('DiscordNotFoundError', () => {
  it('captures resourceType + id and suggests a list tool', () => {
    const e = new DiscordNotFoundError('channel', '1234');
    expect(e.code).toBe('DISCORD_NOT_FOUND');
    expect(e.retriable).toBe(false);
    expect(e.resourceType).toBe('channel');
    expect(e.id).toBe('1234');
    expect(e.suggestedTool).toBe('channels_list');
    expect(e.recoveryHint).toContain('VIEW');
  });
});
