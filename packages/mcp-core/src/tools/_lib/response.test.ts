import { describe, it, expect } from 'vitest';
import { dualResult } from './response.js';

describe('dualResult', () => {
  it('returns content[0] text + structuredContent + isError false', () => {
    const r = dualResult({ text: 'hello world', data: { foo: 1 } });
    expect(r.isError).toBe(false);
    expect(r.content).toEqual([{ type: 'text', text: 'hello world' }]);
    expect(r.structuredContent).toEqual({ foo: 1 });
  });
  it('appends truncation note + cursor suggestion when truncated', () => {
    const r = dualResult({
      text: '5 channels',
      data: { items: [], has_more: true },
      truncated: { reason: 'Showing 5 of 47 results', cursor: 'eyJ...', full_count: 47 },
    });
    const txt = (r.content[0] as { type: string; text: string }).text;
    expect(txt).toContain('5 channels');
    expect(txt).toContain('Showing 5 of 47 results');
    expect(txt).toContain('cursor:"eyJ..."');
    expect(txt).toContain('47 total available');
  });
});
