import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import messagesEdit from './edit.js';
import '../../container.js';

describe('messages_edit', () => {
  it('returns updated message id + edited_timestamp', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = messagesEdit;
    const t = new T({ name: 'messages_edit', path: 'inline', root: 'inline', store: null as never }, { name: 'messages_edit', enabled: true });
    const r = (await t.run(
      { channel_id: '111122223333444455', message_id: '999000999000999000', content: 'updated' },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { message_id: string; edited_timestamp: string } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.message_id).toBe('999000999000999000');
    expect(r.structuredContent.edited_timestamp).toBe('2026-04-28T13:00:00.000000+00:00');
  });
});
