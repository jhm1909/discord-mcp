import { describe, expect, it } from 'vitest';
import { redactArgs } from './redact.js';

describe('redactArgs (Plan 8 Phase E placeholder)', () => {
  it('redacts globally sensitive top-level keys', () => {
    const out = redactArgs(
      {
        channel_id: '111',
        token: 'super-secret',
        bearer_token: 'abc',
        auth: 'xyz',
        password: 'p@ss',
        secret: 's',
      },
      'webhooks_create',
    );
    expect(out.channel_id).toBe('111');
    expect(out.token).toBe('[REDACTED]');
    expect(out.bearer_token).toBe('[REDACTED]');
    expect(out.auth).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect(out.secret).toBe('[REDACTED]');
  });

  it('redacts case-insensitively (TOKEN, Bearer_Token, etc.)', () => {
    const out = redactArgs({ TOKEN: 'x', Bearer_Token: 'y' }, 'tool');
    expect(out.TOKEN).toBe('[REDACTED]');
    expect(out.Bearer_Token).toBe('[REDACTED]');
  });

  it('truncates strings longer than 200 chars to 100 chars + suffix', () => {
    const long = 'a'.repeat(500);
    const out = redactArgs({ content: long }, 'messages_send');
    const truncated = out.content as string;
    expect(truncated).toHaveLength(100 + '...[TRUNCATED]'.length);
    expect(truncated.endsWith('...[TRUNCATED]')).toBe(true);
    expect(truncated.startsWith('a'.repeat(100))).toBe(true);
  });

  it('does NOT truncate strings up to 200 chars (boundary check)', () => {
    const at200 = 'b'.repeat(200);
    const at201 = 'c'.repeat(201);
    const out = redactArgs({ a: at200, b: at201 }, 'tool');
    expect(out.a).toBe(at200);
    expect((out.b as string).endsWith('...[TRUNCATED]')).toBe(true);
  });

  it('passes nested objects through unchanged at this stage (Phase F walks recursively)', () => {
    const nested = { embed: { title: 'hi', secret: 'leaked-but-nested' } };
    const out = redactArgs(nested, 'messages_send');
    expect(out.embed).toEqual(nested.embed);
  });

  it('passes non-string scalars through unchanged', () => {
    const out = redactArgs({ count: 5, flag: true, missing: null, undef: undefined }, 'tool');
    expect(out.count).toBe(5);
    expect(out.flag).toBe(true);
    expect(out.missing).toBeNull();
    expect(out.undef).toBeUndefined();
  });

  it('returns an empty object when args is null / undefined / non-object / array', () => {
    expect(redactArgs(null, 'tool')).toEqual({});
    expect(redactArgs(undefined, 'tool')).toEqual({});
    expect(redactArgs('hello', 'tool')).toEqual({});
    expect(redactArgs(42, 'tool')).toEqual({});
    expect(redactArgs([1, 2, 3], 'tool')).toEqual({});
  });
});
