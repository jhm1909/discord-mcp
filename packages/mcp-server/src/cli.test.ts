import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock startStdio so `serve` is a no-op. Hoisted before cli.ts loads.
vi.mock('./transports/stdio.js', () => ({
  startStdio: vi.fn(async () => {
    // No-op: real startStdio would block on the MCP transport.
  }),
}));

// Now import cli — its top-level auto-parse is gated behind VITEST=true.
const { program } = await import('./cli.js');
const { startStdio } = await import('./transports/stdio.js');

import packageJson from '../package.json' with { type: 'json' };

const originalGateway = process.env.GATEWAY;
const originalExitCode = process.exitCode;

let stdoutWrites: string[] = [];

beforeEach(() => {
  stdoutWrites = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown): boolean => {
    stdoutWrites.push(typeof chunk === 'string' ? chunk : String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  delete process.env.GATEWAY;
  process.exitCode = 0;
  vi.mocked(startStdio).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalGateway !== undefined) {
    process.env.GATEWAY = originalGateway;
  } else {
    delete process.env.GATEWAY;
  }
  process.exitCode = originalExitCode;
});

function stdoutOutput(): string {
  return stdoutWrites.join('');
}

/**
 * Drive commander.parseAsync with synthetic argv. We override commander's
 * default exit/output behavior so version/help don't terminate the test
 * process and so we can capture their output via our stdout spy.
 */
async function runCli(args: string[]): Promise<void> {
  program.exitOverride();
  program.configureOutput({
    writeOut: (str) => {
      stdoutWrites.push(str);
    },
    writeErr: (str) => {
      stdoutWrites.push(str);
    },
  });
  try {
    await program.parseAsync(['node', 'cli.js', ...args]);
  } catch (e) {
    // commander.exitOverride() throws CommanderError for --version / --help
    // and unknown commands. Re-throw only if it's not one of those terminal
    // codes so tests can still see real failures.
    const code = (e as { code?: string } | undefined)?.code;
    if (
      code !== 'commander.version' &&
      code !== 'commander.helpDisplayed' &&
      code !== 'commander.help'
    ) {
      throw e;
    }
  }
}

describe('cli — version + help', () => {
  it('--version prints package version', async () => {
    await runCli(['--version']);
    expect(stdoutOutput()).toContain(packageJson.version);
  });

  it('--help lists all sub-commands', async () => {
    await runCli(['--help']);
    const out = stdoutOutput();
    expect(out).toContain('serve');
    expect(out).toContain('doctor');
    expect(out).toContain('init');
    expect(out).toContain('migrate');
  });
});

describe('cli — serve (default sub-command)', () => {
  it('bare invocation routes to serve', async () => {
    await runCli([]);
    expect(startStdio).toHaveBeenCalledTimes(1);
    expect(process.env.GATEWAY).toBeUndefined();
  });

  it('explicit `serve` sub-command works', async () => {
    await runCli(['serve']);
    expect(startStdio).toHaveBeenCalledTimes(1);
  });

  it('serve --gateway sets GATEWAY=1', async () => {
    await runCli(['serve', '--gateway']);
    expect(process.env.GATEWAY).toBe('1');
    expect(startStdio).toHaveBeenCalledTimes(1);
  });
});

describe('cli — placeholder sub-commands', () => {
  it('doctor exits with code 2 and prints not-yet-implemented', async () => {
    await runCli(['doctor']);
    expect(process.exitCode).toBe(2);
    expect(stdoutOutput()).toContain('not yet implemented');
    expect(stdoutOutput()).toContain('doctor');
  });

  it('doctor accepts --json without breaking option shape', async () => {
    await runCli(['doctor', '--json']);
    expect(process.exitCode).toBe(2);
  });

  it('doctor accepts --online without breaking option shape', async () => {
    await runCli(['doctor', '--online']);
    expect(process.exitCode).toBe(2);
  });

  it('init exits with code 2 and prints not-yet-implemented', async () => {
    await runCli(['init']);
    expect(process.exitCode).toBe(2);
    expect(stdoutOutput()).toContain('not yet implemented');
    expect(stdoutOutput()).toContain('init');
  });

  it('migrate exits with code 2 and prints not-yet-implemented', async () => {
    await runCli(['migrate']);
    expect(process.exitCode).toBe(2);
    expect(stdoutOutput()).toContain('not yet implemented');
    expect(stdoutOutput()).toContain('migrate');
  });
});
