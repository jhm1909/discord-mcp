import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { describe, expect, it, vi } from 'vitest';
import summarizeChannel from './summarize_channel.js';
import '../../container.js';

describe('intelligence_summarize_channel', () => {
  it('returns structured summary when sampling is supported', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken(
      'fake-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const T = summarizeChannel;
    const t = new T(
      {
        name: 'intelligence_summarize_channel',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_summarize_channel', enabled: true },
    );
    const requestSampling = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: {
        type: 'text',
        text: '{"summary":"3 messages exchanged","key_topics":["greetings"],"action_items":[]}',
      },
    });
    const r = (await t.run({ channel_id: '112233445566778899', limit: 50, style: 'bullet' }, {
      signal: new AbortController().signal,
      samplingSupported: true,
      requestSampling,
    } as never)) as {
      isError: boolean;
      structuredContent: {
        summary: string;
        key_topics: string[];
        action_items: string[];
        sampling_used: boolean;
        message_count_used: number;
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.summary).toBe('3 messages exchanged');
    expect(r.structuredContent.key_topics).toEqual(['greetings']);
    expect(r.structuredContent.sampling_used).toBe(true);
    expect(r.structuredContent.message_count_used).toBe(3);
    expect(requestSampling).toHaveBeenCalledTimes(1);
  });

  it('falls back when sampling is unsupported (returns raw messages + _meta)', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake');
    const T = summarizeChannel;
    const t = new T(
      {
        name: 'intelligence_summarize_channel',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_summarize_channel', enabled: true },
    );
    const requestSampling = vi.fn();
    const r = (await t.run({ channel_id: '112233445566778899', limit: 50, style: 'bullet' }, {
      signal: new AbortController().signal,
      samplingSupported: false,
      requestSampling,
    } as never)) as {
      isError: boolean;
      structuredContent: { sampling_used?: boolean; _meta?: { fallback: string } };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent._meta?.fallback).toBe('host_llm_should_process');
    expect(requestSampling).not.toHaveBeenCalled();
  });

  it('handles malformed LLM JSON response gracefully (sampling_used: true, summary contains raw text)', async () => {
    container.rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake');
    const T = summarizeChannel;
    const t = new T(
      {
        name: 'intelligence_summarize_channel',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_summarize_channel', enabled: true },
    );
    const requestSampling = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: 'just a plain summary text, not JSON' },
    });
    const r = (await t.run({ channel_id: '112233445566778899', limit: 50, style: 'bullet' }, {
      signal: new AbortController().signal,
      samplingSupported: true,
      requestSampling,
    } as never)) as {
      isError: boolean;
      structuredContent: {
        sampling_used: boolean;
        summary: string;
        key_topics: string[];
        action_items: string[];
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.sampling_used).toBe(true);
    expect(r.structuredContent.summary).toContain('just a plain summary text');
    expect(r.structuredContent.key_topics).toEqual([]);
    expect(r.structuredContent.action_items).toEqual([]);
  });
});
