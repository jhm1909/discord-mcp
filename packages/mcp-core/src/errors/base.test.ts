import { describe, expect, it } from 'vitest';
import { DiscordClientError, DiscordError, DiscordServerError } from './base.js';

class _TestClient extends DiscordClientError {
  readonly code = 'TEST_CLIENT';
  readonly retriable = false;
}

class _TestServer extends DiscordServerError {
  readonly code = 'TEST_SERVER';
}

describe('DiscordError hierarchy', () => {
  it('client errors carry category="client" and respect retriable', () => {
    const e = new _TestClient('boom');
    expect(e).toBeInstanceOf(DiscordError);
    expect(e.category).toBe('client');
    expect(e.code).toBe('TEST_CLIENT');
    expect(e.retriable).toBe(false);
    expect(e.message).toBe('boom');
  });

  it('server errors carry category="server" and default retriable=true', () => {
    const e = new _TestServer('upstream down');
    expect(e).toBeInstanceOf(DiscordError);
    expect(e.category).toBe('server');
    expect(e.code).toBe('TEST_SERVER');
    expect(e.retriable).toBe(true);
  });

  it('preserves cause on the error instance', () => {
    const original = new Error('original');
    const e = new _TestClient('wrapped', original);
    expect(e.cause).toBe(original);
  });

  it('captures the constructor name in `.name`', () => {
    const e = new _TestClient('x');
    expect(e.name).toBe('_TestClient');
  });
});
