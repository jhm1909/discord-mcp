import { describe, expect, it, vi } from 'vitest';
import moderateContent from './moderate_content.js';

describe('intelligence_moderate_content', () => {
  it('returns allow decision when sampling is supported and content is benign', async () => {
    const T = moderateContent;
    const t = new T(
      {
        name: 'intelligence_moderate_content',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_moderate_content', enabled: true },
    );
    const requestSampling = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: '{"decision":"allow","reasons":[],"confidence":0.95}' },
    });
    const r = (await t.run({ content: 'Hello everyone!', policy: 'Reject hate speech and spam.' }, {
      signal: new AbortController().signal,
      samplingSupported: true,
      requestSampling,
    } as never)) as {
      isError: boolean;
      structuredContent: {
        decision: string;
        reasons: string[];
        confidence: number;
        sampling_used: boolean;
      };
    };
    expect(r.isError).toBe(false);
    expect(r.structuredContent.decision).toBe('allow');
    expect(r.structuredContent.confidence).toBe(0.95);
    expect(r.structuredContent.sampling_used).toBe(true);
  });

  it('returns block decision with reasons when sampling flags content', async () => {
    const T = moderateContent;
    const t = new T(
      {
        name: 'intelligence_moderate_content',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_moderate_content', enabled: true },
    );
    const requestSampling = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: {
        type: 'text',
        text: '{"decision":"block","reasons":["hate speech","incitement"],"confidence":0.92}',
      },
    });
    const r = (await t.run({ content: 'horrible spam content', policy: 'Reject hate speech.' }, {
      signal: new AbortController().signal,
      samplingSupported: true,
      requestSampling,
    } as never)) as {
      isError: boolean;
      structuredContent: { decision: string; reasons: string[]; confidence: number };
    };
    expect(r.structuredContent.decision).toBe('block');
    expect(r.structuredContent.reasons).toContain('hate speech');
  });

  it('falls back with raw content + policy when sampling unsupported', async () => {
    const T = moderateContent;
    const t = new T(
      {
        name: 'intelligence_moderate_content',
        path: 'inline',
        root: 'inline',
        store: null as never,
      },
      { name: 'intelligence_moderate_content', enabled: true },
    );
    const requestSampling = vi.fn();
    const r = (await t.run({ content: 'something', policy: 'no spam at all.' }, {
      signal: new AbortController().signal,
      samplingSupported: false,
      requestSampling,
    } as never)) as { isError: boolean; structuredContent: { _meta?: { fallback: string } } };
    expect(r.structuredContent._meta?.fallback).toBe('host_llm_should_process');
    expect(requestSampling).not.toHaveBeenCalled();
  });
});
