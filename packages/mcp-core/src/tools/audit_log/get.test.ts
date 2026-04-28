import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import auditLogGet from './get.js';
import '../../container.js';

describe('audit_log_get', () => {
  it('returns audit entries with action_type', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = auditLogGet;
    const t = new T({ name: 'audit_log_get', path: 'inline', root: 'inline', store: null as never }, { name: 'audit_log_get', enabled: true });
    const r = (await t.run({ guild_id: '999000999000999000', limit: 2 }, { signal: new AbortController().signal })) as {
      isError: boolean;
      structuredContent: { entries: Array<{ id: string; action_type: number }>; count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.count).toBe(2);
    expect(r.structuredContent.entries[0]!.action_type).toBe(20);
  });
});
