import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it } from 'vitest';
import messagesSearchRecent from './search_recent.js';
import '../../container.js';

describe('messages_search_recent', () => {
  it('filters default-handler messages by substring', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token-aaaaaa');
    // Default handler returns "message {n} content" for n in 1..3 with limit=3.
    const T = messagesSearchRecent;
    const t = new T(
      { name: 'messages_search_recent', path: 'inline', root: 'inline', store: null as never },
      { name: 'messages_search_recent', enabled: true },
    );
    const r = (await t.run(
      { channel_id: '111122223333444401', query: 'message 2', limit: 3 },
      { signal: new AbortController().signal },
    )) as {
      isError: boolean;
      structuredContent: { matches: Array<{ content: string }>; scanned_count: number };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.scanned_count).toBe(3);
    expect(r.structuredContent.matches.length).toBe(1);
    expect(r.structuredContent.matches[0]?.content).toContain('message 2');
  });
});
