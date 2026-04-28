import { describe, it, expect } from 'vitest';
import { formatErrorForUser } from './format.js';
import {
  DiscordPermissionError,
  DiscordRateLimitError,
  DiscordNotFoundError,
  ValidationError,
  DiscordAuthError,
  DiscordCloudflareBlocked,
  ScopeRejectedError,
  GuildNotAllowedError,
  DryRunPreview,
  CancelledError,
} from './index.js';
import { DiscordServerErrorImpl, InternalError } from './server.js';

const stdio = { toolName: 'messages_send', transport: 'stdio' as const };

describe('formatErrorForUser', () => {
  it('formats DiscordPermissionError with markdown body + structured', () => {
    const r = formatErrorForUser(
      new DiscordPermissionError(['MANAGE_MESSAGES'], ['SEND_MESSAGES'], 'channel:1'),
      stdio,
    );
    expect(r.isError).toBe(true);
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Permission Denied/);
    expect(text).toMatch(/MANAGE_MESSAGES/);
    expect(text).toMatch(/SEND_MESSAGES/);
    expect(r.structuredContent).toMatchObject({
      code: 'DISCORD_PERMISSION_DENIED',
      retriable: false,
      category: 'client',
      missing: ['MANAGE_MESSAGES'],
      have: ['SEND_MESSAGES'],
      resource: 'channel:1',
    });
  });

  it('formats DiscordRateLimitError with retry_after_ms in structured', () => {
    const r = formatErrorForUser(
      new DiscordRateLimitError(2400, 'POST /channels/X/messages', 'user', 'messages_bulk_send'),
      stdio,
    );
    expect(r.structuredContent).toMatchObject({
      code: 'DISCORD_RATE_LIMITED',
      retriable: true,
      retry_after_ms: 2400,
      bucket: 'POST /channels/X/messages',
      scope: 'user',
      suggested_tool: 'messages_bulk_send',
    });
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Rate Limited/);
    expect(text).toMatch(/2400ms/);
    expect(text).toMatch(/messages_bulk_send/);
  });

  it('formats DiscordNotFoundError', () => {
    const r = formatErrorForUser(new DiscordNotFoundError('channel', '99'), stdio);
    expect(r.structuredContent).toMatchObject({
      code: 'DISCORD_NOT_FOUND',
      retriable: false,
      resource_type: 'channel',
      id: '99',
      suggested_tool: 'channels_list',
    });
  });

  it('formats ValidationError with bullet list', () => {
    const r = formatErrorForUser(
      new ValidationError([
        { path: 'channel_id', message: 'Must be 17-20 digit', code: 'invalid_string' },
      ]),
      stdio,
    );
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Input Error/);
    expect(text).toMatch(/channel_id/);
    expect(r.structuredContent).toMatchObject({ code: 'VALIDATION_FAILED', retriable: false });
  });

  it('formats DiscordCloudflareBlocked with STOP warning', () => {
    const r = formatErrorForUser(new DiscordCloudflareBlocked(), stdio);
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/CLOUDFLARE BANNED/);
    expect(text).toMatch(/STOP/);
    expect(r.structuredContent).toMatchObject({ retry_after_ms: 3_600_000 });
  });

  it('formats ScopeRejectedError', () => {
    const r = formatErrorForUser(
      new ScopeRejectedError('member_ban', 'moderation', ['read', 'write']),
      stdio,
    );
    expect(r.structuredContent).toMatchObject({
      code: 'SCOPE_REJECTED',
      tool: 'member_ban',
      required: 'moderation',
      granted: ['read', 'write'],
    });
  });

  it('formats GuildNotAllowedError', () => {
    const r = formatErrorForUser(new GuildNotAllowedError('1234'), stdio);
    expect(r.structuredContent).toMatchObject({ code: 'GUILD_NOT_ALLOWED', guild_id: '1234' });
  });

  it('formats DryRunPreview with embedded JSON preview', () => {
    const r = formatErrorForUser(
      new DryRunPreview('member_ban', { user_id: '5' }),
      stdio,
    );
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Dry-Run/);
    expect(text).toMatch(/"user_id"/);
    expect(text).toMatch(/"5"/);
  });

  it('formats CancelledError', () => {
    const r = formatErrorForUser(new CancelledError(), stdio);
    expect(r.structuredContent).toMatchObject({ code: 'CANCELLED', retriable: false });
  });

  it('formats DiscordServerErrorImpl as server error with sentryEventId', () => {
    const r = formatErrorForUser(
      new DiscordServerErrorImpl(503, 'POST /x'),
      { ...stdio, sentryEventId: 'abc123' },
    );
    expect(r.structuredContent).toMatchObject({
      code: 'DISCORD_SERVER_ERROR',
      category: 'server',
      retriable: true,
      trace_id: 'abc123',
    });
  });

  it('formats DiscordAuthError', () => {
    const r = formatErrorForUser(new DiscordAuthError('bad token'), stdio);
    expect(r.structuredContent).toMatchObject({
      code: 'DISCORD_AUTH_INVALID',
      retriable: false,
    });
  });

  it('falls back to INTERNAL_ERROR for unknown thrown values', () => {
    const r = formatErrorForUser('plain string thrown', stdio);
    expect(r.structuredContent).toMatchObject({ code: 'INTERNAL_ERROR' });
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Internal Error/);
    expect(text).toMatch(/messages_send/);
  });

  it('includes sentry event id in trace_id when provided for unknown errors', () => {
    const r = formatErrorForUser(new Error('boom'), { ...stdio, sentryEventId: 'evt_999' });
    expect(r.structuredContent).toMatchObject({ trace_id: 'evt_999' });
  });
});
