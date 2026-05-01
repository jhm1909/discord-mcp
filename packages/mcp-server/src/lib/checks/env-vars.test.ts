import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { envVarsCheck } from './env-vars.js';

// Snapshot full env so we can restore the relevant keys after mutating.
const originalToken = process.env.DISCORD_TOKEN;
const originalAuditSink = process.env.MCP_AUDIT_SINK;

const VALID_TOKEN = `Bot ${'a'.repeat(60)}`;

beforeEach(() => {
  delete process.env.DISCORD_TOKEN;
  delete process.env.MCP_AUDIT_SINK;
});

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.DISCORD_TOKEN;
  } else {
    process.env.DISCORD_TOKEN = originalToken;
  }
  if (originalAuditSink === undefined) {
    delete process.env.MCP_AUDIT_SINK;
  } else {
    process.env.MCP_AUDIT_SINK = originalAuditSink;
  }
});

describe('envVarsCheck', () => {
  it('has the correct id, description, and online flag', () => {
    expect(envVarsCheck.id).toBe('env-vars');
    expect(envVarsCheck.description).toBe('Config environment variables');
    expect(envVarsCheck.online).toBe(false);
  });

  it('returns ok when DISCORD_TOKEN is present and Config parses', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    const r = await envVarsCheck.run(null);
    expect(r.status).toBe('ok');
  });

  it('returns fail when DISCORD_TOKEN is missing', async () => {
    const r = await envVarsCheck.run(null);
    expect(r.status).toBe('fail');
    expect(r.details?.errors).toBeDefined();
    const errors = r.details?.errors as Array<{ path: string; message: string }> | undefined;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors?.length).toBeGreaterThan(0);
  });

  it('returns fail when MCP_AUDIT_SINK has an invalid enum value', async () => {
    process.env.DISCORD_TOKEN = VALID_TOKEN;
    process.env.MCP_AUDIT_SINK = 'bogus-sink';
    const r = await envVarsCheck.run(null);
    expect(r.status).toBe('fail');
  });
});
