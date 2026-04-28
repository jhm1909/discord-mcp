import { describe, expect, it } from 'vitest';
import { DiscordServerErrorImpl, InternalError } from './server.js';

describe('DiscordServerErrorImpl', () => {
  it('captures HTTP status + route, retriable=true', () => {
    const e = new DiscordServerErrorImpl(503, 'POST /channels/X/messages');
    expect(e.code).toBe('DISCORD_SERVER_ERROR');
    expect(e.category).toBe('server');
    expect(e.retriable).toBe(true);
    expect(e.status).toBe(503);
    expect(e.route).toBe('POST /channels/X/messages');
    expect(e.recoveryHint).toMatch(/Auto-retry/);
  });
});

describe('InternalError', () => {
  it('is server-category, retriable, has generic hint', () => {
    const e = new InternalError('unexpected');
    expect(e.code).toBe('INTERNAL_ERROR');
    expect(e.category).toBe('server');
    expect(e.retriable).toBe(true);
    expect(e.recoveryHint).toMatch(/audit log/);
  });
});
