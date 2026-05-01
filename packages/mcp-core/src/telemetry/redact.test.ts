import { describe, expect, it } from 'vitest';
import { redactRoute } from './redact.js';

describe('redactRoute', () => {
  it('replaces a single snowflake ID with :id', () => {
    expect(redactRoute('/channels/123456789012345678')).toBe('/channels/:id');
  });

  it('replaces multiple snowflake IDs in the same path', () => {
    expect(redactRoute('/channels/123456789012345678/messages/987654321098765432')).toBe(
      '/channels/:id/messages/:id',
    );
  });

  it('preserves the @me literal verbatim', () => {
    expect(redactRoute('/users/@me/guilds/111122223333444455')).toBe('/users/@me/guilds/:id');
  });

  it('preserves the @original literal (interactions edge case)', () => {
    expect(redactRoute('/webhooks/123456789012345678/abc/messages/@original')).toBe(
      '/webhooks/:id/abc/messages/@original',
    );
  });

  it('strips query strings entirely', () => {
    expect(redactRoute('/guilds/111122223333444455/regions?limit=10')).toBe('/guilds/:id/regions');
  });

  it('strips multi-param query strings without leaking values', () => {
    expect(
      redactRoute('/channels/111122223333444455/messages?limit=50&before=987654321098765432'),
    ).toBe('/channels/:id/messages');
  });

  it('leaves short numeric segments alone (e.g. API version)', () => {
    // 10 is an API version, not a snowflake. The regex matches 17–20
    // digits, so this stays put.
    expect(redactRoute('/v10/guilds/111122223333444455')).toBe('/v10/guilds/:id');
  });

  it('handles paths without IDs unchanged', () => {
    expect(redactRoute('/gateway/bot')).toBe('/gateway/bot');
  });

  it('handles a 17-digit snowflake (lower bound)', () => {
    expect(redactRoute('/channels/12345678901234567')).toBe('/channels/:id');
  });

  it('handles a 20-digit snowflake (upper bound)', () => {
    expect(redactRoute('/channels/12345678901234567890')).toBe('/channels/:id');
  });
});
