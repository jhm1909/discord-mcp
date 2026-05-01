/**
 * `migrateAction` unit tests — Plan 9 Phase E.
 *
 * Drives the command directly (no commander). Captures stdout via a
 * vi.spyOn write hook so tests can assert pretty-mode strings and
 * parse JSON-mode payloads. Uses the synthetic Hubdustry fixture for
 * the happy-path "ran with unmapped" assertion.
 *
 * cwd is mutated for the "no --source" branch — restored in afterEach.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateAction } from './migrate.js';

const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE_ROOT = join(PACKAGE_ROOT, 'test-fixtures', 'hubdustry-go-mcp');

const originalExitCode = process.exitCode;
const originalCwd = process.cwd();

let stdoutWrites: string[] = [];

beforeEach(() => {
  stdoutWrites = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown): boolean => {
    stdoutWrites.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  });
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = originalExitCode;
  // Restore cwd in case a test changed it.
  if (process.cwd() !== originalCwd) {
    process.chdir(originalCwd);
  }
});

function stdoutOutput(): string {
  return stdoutWrites.join('');
}

interface MigrateJsonResult {
  ok: boolean;
  exitCode: number;
  summary: string;
  data?: {
    available?: { id: string; description: string }[] | string[];
    requested?: string;
    adapter?: string;
    sourcePath?: string;
    result?: {
      source: string;
      sourcePath: string;
      mappedTools: { original: string; mapped: string; confidence: string }[];
      unmappedTools: string[];
      manualReview: { original: string; reason: string }[];
      warnings: string[];
    };
  };
  errors?: string[];
}

describe('migrateAction — no --from', () => {
  it('exits 2 and lists available adapters in JSON', async () => {
    await migrateAction({ json: true });
    expect(process.exitCode).toBe(2);
    const parsed = JSON.parse(stdoutOutput()) as MigrateJsonResult;
    expect(parsed.ok).toBe(false);
    expect(parsed.summary).toContain('--from');
    const available = parsed.data?.available as { id: string; description: string }[];
    expect(Array.isArray(available)).toBe(true);
    expect(available.some((a) => a.id === 'hubdustry-go-mcp')).toBe(true);
  });

  it('pretty mode prints available adapter ids', async () => {
    await migrateAction({});
    expect(process.exitCode).toBe(2);
    const out = stdoutOutput();
    expect(out).toContain('Available adapters');
    expect(out).toContain('hubdustry-go-mcp');
  });
});

describe('migrateAction — unknown --from', () => {
  it('exits 2 with the requested id and the available list', async () => {
    await migrateAction({ json: true, from: 'no-such-adapter' });
    expect(process.exitCode).toBe(2);
    const parsed = JSON.parse(stdoutOutput()) as MigrateJsonResult;
    expect(parsed.summary).toContain('no-such-adapter');
    expect(parsed.data?.requested).toBe('no-such-adapter');
    expect(parsed.data?.available).toContain('hubdustry-go-mcp');
  });
});

describe('migrateAction — source not detected', () => {
  it('exits 2 when the source path has no Hubdustry markers', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'migrate-no-source-'));
    try {
      await migrateAction({ json: true, from: 'hubdustry-go-mcp', source: empty });
      expect(process.exitCode).toBe(2);
      const parsed = JSON.parse(stdoutOutput()) as MigrateJsonResult;
      expect(parsed.summary).toContain('source not detected');
      expect(parsed.data?.adapter).toBe('hubdustry-go-mcp');
      expect(parsed.data?.sourcePath).toBe(empty);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('falls back to process.cwd() when --source is omitted', async () => {
    // Move cwd somewhere with no Hubdustry markers, run with no --source.
    // The result should mention that cwd as the sourcePath in the error.
    const empty = mkdtempSync(join(tmpdir(), 'migrate-cwd-'));
    process.chdir(empty);
    try {
      await migrateAction({ json: true, from: 'hubdustry-go-mcp' });
      expect(process.exitCode).toBe(2);
      const parsed = JSON.parse(stdoutOutput()) as MigrateJsonResult;
      expect(parsed.summary).toContain('source not detected');
    } finally {
      // afterEach restores cwd before rmSync would conflict.
      process.chdir(originalCwd);
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('migrateAction — Hubdustry fixture run', () => {
  it('exits 1 (unmapped) and surfaces the 5 fixture tools', async () => {
    await migrateAction({ json: true, from: 'hubdustry-go-mcp', source: FIXTURE_ROOT });
    expect(process.exitCode).toBe(1);
    const parsed = JSON.parse(stdoutOutput()) as MigrateJsonResult;
    expect(parsed.ok).toBe(false);
    expect(parsed.exitCode).toBe(1);
    expect(parsed.summary).toContain('0/5 mapped');
    expect(parsed.summary).toContain('5 unmapped');
    const result = parsed.data?.result;
    expect(result?.unmappedTools.length).toBe(5);
    expect(result?.mappedTools.length).toBe(0);
    expect(result?.manualReview.length).toBe(0);
  });

  it('pretty mode lists the unmapped tool names under "Unmapped"', async () => {
    await migrateAction({ json: false, from: 'hubdustry-go-mcp', source: FIXTURE_ROOT });
    expect(process.exitCode).toBe(1);
    const out = stdoutOutput();
    expect(out).toContain('Unmapped (5)');
    expect(out).toContain('server.files.list');
    expect(out).toContain('server.deploy.trigger');
  });
});

describe('migrateAction — JSON output is parseable', () => {
  it('every code path produces valid JSON when --json is set', async () => {
    // Each branch parses cleanly.
    await migrateAction({ json: true });
    expect(() => JSON.parse(stdoutOutput())).not.toThrow();

    stdoutWrites = [];
    await migrateAction({ json: true, from: 'hubdustry-go-mcp', source: FIXTURE_ROOT });
    expect(() => JSON.parse(stdoutOutput())).not.toThrow();
  });
});
