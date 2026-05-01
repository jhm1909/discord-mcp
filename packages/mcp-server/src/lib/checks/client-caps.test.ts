import { describe, expect, it } from 'vitest';
import { clientCapsCheck } from './client-caps.js';

describe('clientCapsCheck', () => {
  it('has the correct id, description, and online flag', () => {
    expect(clientCapsCheck.id).toBe('client-caps');
    expect(clientCapsCheck.description).toBe('MCP capabilities advertised');
    expect(clientCapsCheck.online).toBe(false);
  });

  it('always returns ok with the advertised method list', async () => {
    const r = await clientCapsCheck.run(null);
    expect(r.status).toBe('ok');
    const advertised = r.details?.advertised;
    expect(Array.isArray(advertised)).toBe(true);
    expect(advertised).toContain('tools/list');
    expect(advertised).toContain('tools/call');
    expect(advertised).toContain('resources/list');
    expect(advertised).toContain('resources/read');
    expect(advertised).toContain('resources/subscribe');
    expect(advertised).toContain('resources/unsubscribe');
  });
});
