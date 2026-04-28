import { describe, it, expect } from 'vitest';
import { CapabilityRouter } from './router.js';
import type { ClientCapabilitiesSnapshot } from './types.js';

const cap = (overrides: Partial<ClientCapabilitiesSnapshot> = {}): ClientCapabilitiesSnapshot => ({
  protocolVersion: '2025-11-25',
  sampling: false,
  elicitation: false,
  completion: false,
  progress: false,
  cancellation: true,
  resourcesSubscribe: false,
  tasks: false,
  ...overrides,
});

describe('CapabilityRouter', () => {
  it('reports flags from the snapshot', () => {
    const r = new CapabilityRouter(cap({ sampling: true, elicitation: true }));
    expect(r.has('sampling')).toBe(true);
    expect(r.has('elicitation')).toBe(true);
    expect(r.has('tasks')).toBe(false);
  });

  it('protocolAtLeast returns true when negotiated >= target', () => {
    const r = new CapabilityRouter(cap({ protocolVersion: '2025-11-25' }));
    expect(r.protocolAtLeast('2025-06-18')).toBe(true);
    expect(r.protocolAtLeast('2025-11-25')).toBe(true);
    expect(r.protocolAtLeast('2026-06-18')).toBe(false);
  });

  it('summary returns a stable shape for diagnostics', () => {
    const r = new CapabilityRouter(cap({ sampling: true }));
    const s = r.summary();
    expect(s).toMatchObject({
      protocol_version: '2025-11-25',
      sampling: true,
      elicitation: false,
      tasks: false,
    });
  });
});

describe('CapabilityRouter.runOrFallback', () => {
  it('runs primary when the required capability is present', async () => {
    const r = new CapabilityRouter(cap({ sampling: true }));
    const result = await r.runOrFallback(
      'sampling',
      async () => 'primary-ran',
      async () => 'fallback-ran',
    );
    expect(result).toBe('primary-ran');
  });

  it('runs fallback when the required capability is missing', async () => {
    const r = new CapabilityRouter(cap({ sampling: false }));
    const result = await r.runOrFallback(
      'sampling',
      async () => 'primary-ran',
      async () => 'fallback-ran',
    );
    expect(result).toBe('fallback-ran');
  });

  it('propagates errors from primary as-is', async () => {
    const r = new CapabilityRouter(cap({ sampling: true }));
    await expect(
      r.runOrFallback(
        'sampling',
        async () => {
          throw new Error('primary boom');
        },
        async () => 'fb',
      ),
    ).rejects.toThrow('primary boom');
  });

  it('propagates errors from fallback as-is', async () => {
    const r = new CapabilityRouter(cap({ sampling: false }));
    await expect(
      r.runOrFallback(
        'sampling',
        async () => 'p',
        async () => {
          throw new Error('fb boom');
        },
      ),
    ).rejects.toThrow('fb boom');
  });
});
