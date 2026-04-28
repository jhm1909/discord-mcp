import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import messagesDelete from './delete.js';
import '../../container.js';

describe('messages_delete', () => {
  it('calls Discord DELETE and returns success result', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const T = messagesDelete;
    const t = new T({ name: 'messages_delete', path: 'inline', root: 'inline', store: null as never }, { name: 'messages_delete', enabled: true });
    const r = (await t.run(
      { channel_id: '111122223333444455', message_id: '999000999000999000' },
      { signal: new AbortController().signal },
    )) as { isError: boolean; structuredContent: { deleted: boolean; message_id: string } };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.deleted).toBe(true);
    expect(r.structuredContent.message_id).toBe('999000999000999000');
  });

  it('declares ConfirmRequired in preconditions', () => {
    const T = messagesDelete;
    const t = new T({ name: 'messages_delete', path: 'inline', root: 'inline', store: null as never }, { name: 'messages_delete', enabled: true });
    expect(t.preconditions).toContain('confirm_required');
  });

  it('declares destructiveHint=true', () => {
    const T = messagesDelete;
    const t = new T({ name: 'messages_delete', path: 'inline', root: 'inline', store: null as never }, { name: 'messages_delete', enabled: true });
    expect(t.annotations.destructiveHint).toBe(true);
  });
});
