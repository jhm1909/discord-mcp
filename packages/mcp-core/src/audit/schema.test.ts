import { describe, expect, it } from 'vitest';
import type { AuditEvent } from './schema.js';

describe('AuditEvent schema', () => {
  it('type satisfies a representative success sample', () => {
    const sample: AuditEvent = {
      timestamp: '2026-05-01T00:00:00.000Z',
      request_id: 'req-123',
      tool: 'messages_send',
      category: 'messages',
      idempotent: false,
      args_redacted: { channel_id: '111', content: 'hi' },
      status: 'success',
      duration_ms: 12.5,
      transport: 'stdio',
    };
    expect(sample.tool).toBe('messages_send');
    expect(sample.status).toBe('success');
    expect(sample.result_code).toBeUndefined();
  });

  it('type satisfies a tool_error sample with result_code + trace correlation', () => {
    const sample: AuditEvent = {
      timestamp: '2026-05-01T00:00:00.000Z',
      request_id: 'req-456',
      tool: 'messages_delete',
      category: 'messages',
      idempotent: false,
      args_redacted: { channel_id: '111', message_id: '222' },
      status: 'tool_error',
      result_code: 'discord_not_found',
      duration_ms: 42,
      transport: 'stdio',
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
    };
    expect(sample.status).toBe('tool_error');
    expect(sample.result_code).toBe('discord_not_found');
    expect(sample.trace_id).toHaveLength(32);
    expect(sample.span_id).toHaveLength(16);
  });

  it('type satisfies a thrown sample (re-thrown JS exception)', () => {
    const sample: AuditEvent = {
      timestamp: '2026-05-01T00:00:00.000Z',
      request_id: 'req-789',
      tool: 'roles_modify',
      category: 'roles',
      idempotent: false,
      args_redacted: {},
      status: 'thrown',
      result_code: 'TypeError',
      duration_ms: 7,
      transport: 'http',
    };
    expect(sample.status).toBe('thrown');
    expect(sample.transport).toBe('http');
  });

  it('serializes to a JSON line round-trip without loss', () => {
    const original: AuditEvent = {
      timestamp: '2026-05-01T12:34:56.000Z',
      request_id: 'req-rt',
      tool: 'channels_modify',
      category: 'channels',
      idempotent: false,
      args_redacted: { channel_id: '111', name: 'general' },
      status: 'success',
      duration_ms: 33,
      transport: 'stdio',
    };
    const line = JSON.stringify(original);
    const parsed = JSON.parse(line) as AuditEvent;
    expect(parsed).toEqual(original);
  });
});
