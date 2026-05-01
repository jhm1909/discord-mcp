import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock startStdio BEFORE importing serveAction so the import sees the mock.
vi.mock('../transports/stdio.js', () => ({
  startStdio: vi.fn(async () => {
    // No-op: a real startStdio would block on the MCP transport.
  }),
}));

const { serveAction } = await import('./serve.js');
const { startStdio } = await import('../transports/stdio.js');

const originalGateway = process.env.GATEWAY;

beforeEach(() => {
  delete process.env.GATEWAY;
  vi.mocked(startStdio).mockClear();
});

afterEach(() => {
  if (originalGateway !== undefined) {
    process.env.GATEWAY = originalGateway;
  } else {
    delete process.env.GATEWAY;
  }
});

describe('serveAction', () => {
  it('calls startStdio with no gateway flag', async () => {
    await serveAction({});
    expect(startStdio).toHaveBeenCalledTimes(1);
    expect(process.env.GATEWAY).toBeUndefined();
  });

  it('sets GATEWAY=1 when gateway: true', async () => {
    await serveAction({ gateway: true });
    expect(process.env.GATEWAY).toBe('1');
    expect(startStdio).toHaveBeenCalledTimes(1);
  });

  it('does not set GATEWAY when gateway: false', async () => {
    await serveAction({ gateway: false });
    expect(process.env.GATEWAY).toBeUndefined();
    expect(startStdio).toHaveBeenCalledTimes(1);
  });

  it('calls process.exit(1) on startStdio failure', async () => {
    vi.mocked(startStdio).mockRejectedValueOnce(new Error('boom'));
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      // Throw to abort serveAction so the test can assert without actually exiting.
      throw new Error('process.exit called');
    }) as never);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      await expect(serveAction({})).rejects.toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(stderrSpy).toHaveBeenCalled();
      const written = String(stderrSpy.mock.calls[0]?.[0] ?? '');
      expect(written).toContain('discord-mcp failed to start: boom');
    } finally {
      exitSpy.mockRestore();
      stderrSpy.mockRestore();
    }
  });
});
