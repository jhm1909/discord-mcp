/**
 * `env-vars` check — Plan 9 Phase B.
 *
 * Validates the full Config schema by attempting `loadConfig(process.env)`.
 * On success, status='ok'. On zod failure, we extract `issue.path` /
 * `issue.message` pairs into details so users see exactly which env vars
 * are wrong (without leaking values).
 *
 * We re-parse here even though doctor.ts has already attempted parse —
 * the doctor entry point passes `cfg | null` to checks for re-use, but
 * env-vars is the canonical reporter for parse failures, so we own the
 * full re-parse to capture the zod issues array.
 */
import { loadConfig } from '@discord-mcp/core';
import type { DoctorCheck } from './index.js';

// We avoid importing the zod types directly — `zod` isn't a dependency
// of mcp-server (Plan 9 "no new runtime deps" rule). Instead we duck-type
// the {issues: [{path: [...], message: string}]} shape that ZodError
// exposes. loadConfig() in @discord-mcp/core already wraps zod failures
// in a fresh Error with a multi-line message; we look for either form.
interface ZodIssueShape {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
}

interface ZodErrorShape {
  readonly issues: readonly ZodIssueShape[];
}

function isZodErrorLike(e: unknown): e is ZodErrorShape {
  return (
    typeof e === 'object' &&
    e !== null &&
    'issues' in e &&
    Array.isArray((e as { issues?: unknown }).issues)
  );
}

export const envVarsCheck: DoctorCheck = {
  id: 'env-vars',
  description: 'Config environment variables',
  online: false,
  async run() {
    try {
      loadConfig(process.env);
      return {
        id: 'env-vars',
        status: 'ok',
        message: 'All required environment variables are present and valid',
      };
    } catch (e) {
      // loadConfig wraps zod errors in `new Error(...)` (see config.ts) —
      // unwrap by re-parsing if we can find the zod error, else fall back
      // to the message string. We try the underlying schema directly via
      // a fresh import path? No — we just use the message which already
      // lists path + message per issue.
      if (isZodErrorLike(e)) {
        const errors = e.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return {
          id: 'env-vars',
          status: 'fail',
          message: `Config validation failed: ${errors.length} issue(s)`,
          details: { errors },
        };
      }
      // loadConfig throws Error with multi-line message like
      // "Invalid configuration:\n  - DISCORD_TOKEN: too short"
      // We surface it as a single-issue list so the JSON shape stays
      // stable for downstream tooling.
      const message = e instanceof Error ? e.message : String(e);
      return {
        id: 'env-vars',
        status: 'fail',
        message: 'Config validation failed',
        details: { errors: [{ path: '', message }] },
      };
    }
  },
};
