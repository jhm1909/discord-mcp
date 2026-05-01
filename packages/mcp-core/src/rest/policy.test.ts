import { DiscordAPIError, HTTPError } from '@discordjs/rest';
import { TaskCancelledError } from 'cockatiel';
import { describe, expect, it } from 'vitest';
import type { Config } from '../config.js';
import { DiscordRetryableError } from './errors.js';
import { buildPolicy } from './policy.js';

const REQ_BODY = { files: undefined, json: undefined } as const;

/** Minimal in-test `Config` shaped object — only the fields buildPolicy reads. */
function cfg(partial: Partial<Config> = {}): Config {
  return {
    DISCORD_TOKEN: 'Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    LOG_LEVEL: 'info',
    GATEWAY: false,
    OTEL_ENABLED: false,
    OTEL_SERVICE_NAME: 'discord-mcp',
    OTEL_SERVICE_VERSION: '0.8.0',
    OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    OTEL_TRACES_SAMPLER: 'parentbased_always_on',
    OTEL_TRACES_SAMPLER_ARG: 1,
    OTEL_CONSOLE_EXPORTER: false,
    MCP_RETRY_ENABLED: true,
    MCP_RETRY_MAX_ATTEMPTS: 3,
    MCP_RETRY_BASE_DELAY_MS: 50,
    MCP_RETRY_MAX_DELAY_MS: 500,
    MCP_RETRY_JITTER: 'none',
    MCP_TIMEOUT_DEFAULT_MS: 5000,
    MCP_TIMEOUT_LONG_MS: 60000,
    MCP_CIRCUIT_ENABLED: false,
    MCP_CIRCUIT_FAILURE_THRESHOLD: 10,
    MCP_CIRCUIT_HALF_OPEN_AFTER_MS: 60000,
    MCP_BULKHEAD_LIMIT: 100,
    ...partial,
  } as Config;
}

describe('buildPolicy (Plan 8 C.1)', () => {
  it('retries DiscordRetryableError up to maxAttempts then bubbles last error', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 3, MCP_RETRY_BASE_DELAY_MS: 50 }));

    let attempts = 0;
    const finalErr = new DiscordRetryableError(new Error('5xx upstream'), null);
    await expect(
      policy.execute(async () => {
        attempts++;
        throw finalErr;
      }),
    ).rejects.toBe(finalErr);
    // cockatiel's maxAttempts is the number of *retries*; total tries = maxAttempts + 1.
    expect(attempts).toBe(4);
  });

  it('succeeds on retry after a transient DiscordRetryableError', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 3, MCP_RETRY_BASE_DELAY_MS: 50 }));

    let attempts = 0;
    const result = await policy.execute(async () => {
      attempts++;
      if (attempts < 2) {
        throw new DiscordRetryableError(new Error('transient'), null);
      }
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('honors retryAfterMs from Discord 429 (delay >= configured retry-after)', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 2, MCP_RETRY_BASE_DELAY_MS: 50 }));

    let attempts = 0;
    const start = Date.now();
    const result = await policy.execute(async () => {
      attempts++;
      if (attempts === 1) {
        // Force a Retry-After of 250ms; with no jitter the next delay must
        // be at least that.
        throw new DiscordRetryableError(new Error('429'), 250);
      }
      return 'ok';
    });
    const elapsed = Date.now() - start;
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
    // Allow 50ms slack for scheduler.
    expect(elapsed).toBeGreaterThanOrEqual(200);
  });

  it('does NOT retry non-DiscordRetryableError (raw 4xx) — bubbles immediately', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 5 }));

    let attempts = 0;
    const err400 = new DiscordAPIError(
      { code: 50035, message: 'Invalid form body' },
      50035,
      400,
      'POST',
      'https://discord.com/api/v10/test',
      REQ_BODY,
    );
    await expect(
      policy.execute(async () => {
        attempts++;
        throw err400;
      }),
    ).rejects.toBe(err400);
    expect(attempts).toBe(1);
  });

  it('does NOT retry HTTPError 418 — non-retryable bubbles', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 5 }));

    let attempts = 0;
    const err = new HTTPError(418, 'tea', 'GET', 'https://x', REQ_BODY);
    await expect(
      policy.execute(async () => {
        attempts++;
        throw err;
      }),
    ).rejects.toBe(err);
    expect(attempts).toBe(1);
  });

  it('timeout fires when inner fn exceeds MCP_TIMEOUT_DEFAULT_MS (TaskCancelledError)', async () => {
    const policy = buildPolicy(cfg({ MCP_TIMEOUT_DEFAULT_MS: 1000, MCP_RETRY_ENABLED: false }));
    await expect(
      policy.execute(async () => new Promise((resolve) => setTimeout(() => resolve('late'), 5000))),
    ).rejects.toBeInstanceOf(TaskCancelledError);
  });

  it('returns bare timeout policy when MCP_RETRY_ENABLED=false (no retry)', async () => {
    const policy = buildPolicy(cfg({ MCP_RETRY_ENABLED: false }));
    let attempts = 0;
    const finalErr = new DiscordRetryableError(new Error('5xx'), null);
    await expect(
      policy.execute(async () => {
        attempts++;
        throw finalErr;
      }),
    ).rejects.toBe(finalErr);
    expect(attempts).toBe(1); // no retry
  });

  it('uses jitter generator for non-Retry-After backoff (smoke: completes in bounded time)', async () => {
    const policy = buildPolicy(
      cfg({
        MCP_RETRY_MAX_ATTEMPTS: 2,
        MCP_RETRY_BASE_DELAY_MS: 50,
        MCP_RETRY_MAX_DELAY_MS: 500,
        MCP_RETRY_JITTER: 'full',
      }),
    );
    let attempts = 0;
    const start = Date.now();
    const result = await policy.execute(async () => {
      attempts++;
      if (attempts < 2) {
        throw new DiscordRetryableError(new Error('5xx'), null);
      }
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
    // Backoff capped by MCP_RETRY_MAX_DELAY_MS so total run < 1500ms.
    expect(Date.now() - start).toBeLessThan(1500);
  });
});
