import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../errors/client.js';
import { type CursorPayload, decodeCursor, encodeCursor } from './pagination.js';

describe('encodeCursor / decodeCursor', () => {
  it('roundtrips a simple payload', () => {
    const payload: CursorPayload = { after: '12345', limit: 25 };
    const enc = encodeCursor(payload);
    const dec = decodeCursor(enc);
    expect(dec).toEqual(payload);
  });

  it('roundtrips a payload with filter_hash', () => {
    const payload: CursorPayload = {
      after: '12345',
      before: '67890',
      limit: 100,
      filter_hash: 'abc12345',
    };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('produces a base64url string with no padding', () => {
    const enc = encodeCursor({ after: '1', limit: 1 });
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enc).not.toContain('=');
  });

  it('decodeCursor throws ValidationError on garbage input', () => {
    expect(() => decodeCursor('not-base64!!!')).toThrow(ValidationError);
  });

  it('decodeCursor throws ValidationError on valid base64 but non-JSON content', () => {
    const garbage = Buffer.from('not json', 'utf8').toString('base64url');
    expect(() => decodeCursor(garbage)).toThrow(ValidationError);
  });
});
