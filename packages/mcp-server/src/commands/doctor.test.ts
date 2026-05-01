/**
 * Integration-ish tests for `doctorAction` — Plan 9 Phase B.
 *
 * Covers the doctor command's aggregation logic, exit code mapping,
 * and JSON / pretty-mode output. Per-check unit tests live alongside
 * each check under `lib/checks/*.test.ts`. We mock `fs.accessSync`
 * here only for the audit-sink scenarios — everything else uses real
 * env-var manipulation against the real check implementations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock node:fs at module-eval time so audit-sink (file branch) can be
// driven deterministically. Default impl is a no-op (writable). Tests
// that need a failing access rebind `accessSyncImpl` before calling.
let accessSyncImpl: (...args: unknown[]) => void = () => undefined;

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    accessSync: ((...args: unknown[]) => accessSyncImpl(...args)) as typeof actual.accessSync,
  };
});

const { doctorAction } = await import('./doctor.js');

const VALID_TOKEN = `Bot ${'a'.repeat(60)}`;

const originalToken = process.env.DISCORD_TOKEN;
const originalAuditSink = process.env.MCP_AUDIT_SINK;
const originalAuditFile = process.env.MCP_AUDIT_FILE;
const originalIsTTY = process.stdout.isTTY;
const originalExitCode = process.exitCode;

let stdoutWrites: string[] = [];

beforeEach(() => {
  accessSyncImpl = () => undefined;
  stdoutWrites = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown): boolean => {
    stdoutWrites.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  });
  delete process.env.DISCORD_TOKEN;
  delete process.env.MCP_AUDIT_SINK;
  delete process.env.MCP_AUDIT_FILE;
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  accessSyncImpl = () => undefined;
  if (originalToken !== undefined) {
    process.env.DISCORD_TOKEN = originalToken;
  } else {
    delete process.env.DISCORD_TOKEN;
  }
  if (originalAuditSink !== undefined) {
    process.env.MCP_AUDIT_SINK = originalAuditSink;
  } else {
    delete process.env.MCP_AUDIT_SINK;
  }
  if (originalAuditFile !== undefined) {
    process.env.MCP_AUDIT_FILE = originalAuditFile;
  } else {
    delete process.env.MCP_AUDIT_FILE;
  }
  Object.defineProperty(process.stdout, 'isTTY', {
    value: originalIsTTY,
    configurable: true,
    writable: true,
  });
  process.exitCode = originalExitCode;
});

function setTTY(value: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
    writable: true,
  });
}

function stdoutOutput(): string {
  return stdoutWrites.join('');
}

// CSI byte = ESC + '['. Avoid embedded control bytes in regex per
// biome's noControlCharactersInRegex (mirrors output.test.ts).
const CSI_BYTE = '\x1b[';
function hasAnsi(s: string): boolean {
  return s.includes(CSI_BYTE);
}

describe('doctorAction — offline check selection', () => {
  it('runs only offline checks when --online is absent', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: true });
    const parsed = JSON.parse(stdoutOutput()) as {
      data?: { checks?: Array<{ id: string }> };
    };
    const ids = parsed.data?.checks?.map((c) => c.id) ?? [];
    // The 5 offline checks ship in Phase B. Phase C will add online ones.
    expect(ids).toEqual(['node-version', 'token-format', 'env-vars', 'audit-sink', 'client-caps']);
  });

  it('runs the same set when --online is true (no online checks in Phase B)', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: true, online: true });
    const parsed = JSON.parse(stdoutOutput()) as {
      data?: { checks?: Array<{ id: string }> };
    };
    const ids = parsed.data?.checks?.map((c) => c.id) ?? [];
    // Phase B has zero online-tagged checks, so the set is identical.
    expect(ids).toEqual(['node-version', 'token-format', 'env-vars', 'audit-sink', 'client-caps']);
  });
});

describe('doctorAction — exit code mapping', () => {
  it('returns exit code 2 when token-format fails', async () => {
    // No DISCORD_TOKEN → token-format + env-vars both fail.
    await doctorAction({ json: true });
    expect(process.exitCode).toBe(2);
    const parsed = JSON.parse(stdoutOutput());
    expect(parsed.ok).toBe(false);
    const tokenCheck = (parsed.data.checks as Array<{ id: string; status: string }>).find(
      (c) => c.id === 'token-format',
    );
    expect(tokenCheck?.status).toBe('fail');
  });

  it('returns exit code 1 (warn) when only token-format warns and rest are ok', async () => {
    // Valid shape but no "Bot " prefix → token-format warn.
    process.env.DISCORD_TOKEN = 'a'.repeat(60);
    await doctorAction({ json: true });
    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(stdoutOutput());
    expect(parsed.exitCode).toBe(1);
    expect(parsed.warnings).toBeDefined();
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it('returns exit code 0 when all checks pass', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: true });
    expect(process.exitCode).toBe(0);
    const parsed = JSON.parse(stdoutOutput());
    expect(parsed.ok).toBe(true);
    expect(parsed.exitCode).toBe(0);
  });
});

describe('doctorAction — audit-sink branches', () => {
  it('reports audit-sink ok when stderr sink is selected', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    process.env.MCP_AUDIT_SINK = 'stderr';
    await doctorAction({ json: true });
    const parsed = JSON.parse(stdoutOutput());
    const auditCheck = (parsed.data.checks as Array<{ id: string; status: string }>).find(
      (c) => c.id === 'audit-sink',
    );
    expect(auditCheck?.status).toBe('ok');
  });

  it('reports audit-sink fail when file sink is unwritable', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    process.env.MCP_AUDIT_SINK = 'file';
    process.env.MCP_AUDIT_FILE = '/nonexistent/no-perms/audit.jsonl';
    accessSyncImpl = () => {
      throw new Error('EACCES: permission denied');
    };
    await doctorAction({ json: true });
    expect(process.exitCode).toBe(2);
    const parsed = JSON.parse(stdoutOutput());
    const auditCheck = (parsed.data.checks as Array<{ id: string; status: string }>).find(
      (c) => c.id === 'audit-sink',
    );
    expect(auditCheck?.status).toBe('fail');
  });
});

describe('doctorAction — output formatting', () => {
  it('pretty mode includes ANSI color codes when stdout is a TTY', async () => {
    setTTY(true);
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: false });
    const out = stdoutOutput();
    expect(hasAnsi(out)).toBe(true);
    expect(out).toContain('OK');
  });

  it('pretty mode without TTY omits ANSI codes', async () => {
    setTTY(false);
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: false });
    const out = stdoutOutput();
    expect(hasAnsi(out)).toBe(false);
  });

  it('json mode strips ANSI even on TTY and produces parseable output', async () => {
    setTTY(true);
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: true });
    const out = stdoutOutput();
    expect(hasAnsi(out)).toBe(false);
    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out);
    expect(parsed.summary).toMatch(/\d+ checks:/);
  });

  it('summary string follows the "N checks: F fail, W warn, O ok" format', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    await doctorAction({ json: true });
    const parsed = JSON.parse(stdoutOutput());
    expect(parsed.summary).toMatch(/^5 checks: \d+ fail, \d+ warn, \d+ ok$/);
  });
});
