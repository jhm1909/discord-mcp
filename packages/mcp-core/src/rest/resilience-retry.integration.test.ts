import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { REST } from '@discordjs/rest';
import { http, passthrough } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { server as mswServer } from '../../../../test/setup.js';
import type { Config } from '../config.js';
import { buildPolicy } from './policy.js';
import { wrapRestWithResilience } from './resilient.js';

/**
 * Integration: assert that the resilient REST adapter retries 5xx end-to-end
 * against a real HTTP server.  We avoid msw here for the reasons documented
 * in mcp-server/src/otel-undici.integration.test.ts: msw patches global
 * fetch / ClientRequest while undici dispatches at a lower layer, and the
 * conflict produces flaky behavior.  A local node:http server gives us a
 * reliable, deterministic transport.
 */

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
    ...partial,
  } as Config;
}

let httpServer: HttpServer;
let baseUrl: string;
let requestCount: number;
let scriptedResponses: Array<{ status: number; body: string; headers?: Record<string, string> }>;

function buildRest(): REST {
  // Point @discordjs/rest at our local server. `api` becomes the base URL.
  // `retries: 0` mimics what stdio.ts does in production (Plan 8 C.4).
  return new REST({
    version: '10',
    api: baseUrl,
    retries: 0,
    makeRequest: fetch,
  }).setToken('fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
}

beforeAll(async () => {
  scriptedResponses = [];
  requestCount = 0;
  httpServer = createServer((_req, res) => {
    requestCount++;
    const next = scriptedResponses.shift() ?? { status: 500, body: '{"unscripted":true}' };
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...next.headers,
    };
    res.writeHead(next.status, headers);
    res.end(next.body);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((err) => (err ? reject(err) : resolve())),
  );
});

beforeEach(() => {
  scriptedResponses = [];
  requestCount = 0;
  // Tell msw (set up globally with onUnhandledRequest:'error') to bypass
  // requests to our local fixture server.  msw resets between tests.
  mswServer.use(http.all(`${baseUrl}/*`, () => passthrough()));
});

afterEach(() => {
  scriptedResponses = [];
});

describe('resilience retry integration (Plan 8 C.5)', () => {
  it('retries 500 → 500 → 200 and returns the final success body', async () => {
    scriptedResponses = [
      { status: 500, body: '{"message":"upstream broken"}' },
      { status: 500, body: '{"message":"upstream still broken"}' },
      { status: 200, body: '{"id":"123","name":"ok"}' },
    ];
    const rest = wrapRestWithResilience(buildRest(), buildPolicy(cfg()));

    const result = (await rest.get('/channels/123')) as { id: string; name: string };
    expect(result).toEqual({ id: '123', name: 'ok' });
    // Three attempts total: 2 retries + 1 success.
    expect(requestCount).toBe(3);
  });

  it('does NOT retry on 400 — single request, original error bubbles', async () => {
    scriptedResponses = [{ status: 400, body: '{"code":50035,"message":"Invalid form body"}' }];
    const rest = wrapRestWithResilience(buildRest(), buildPolicy(cfg()));

    await expect(
      rest.post('/channels/123/messages', { body: { content: 'x' } }),
    ).rejects.toBeDefined();
    expect(requestCount).toBe(1);
  });

  it('exhausts retries when all attempts fail and surfaces the last error', async () => {
    scriptedResponses = Array.from({ length: 6 }, () => ({
      status: 503,
      body: '{"message":"service unavailable"}',
    }));
    const rest = wrapRestWithResilience(
      buildRest(),
      buildPolicy(cfg({ MCP_RETRY_MAX_ATTEMPTS: 2 })),
    );

    await expect(rest.get('/channels/123')).rejects.toBeDefined();
    // maxAttempts: 2 retries → 3 total tries.
    expect(requestCount).toBe(3);
  });
});
