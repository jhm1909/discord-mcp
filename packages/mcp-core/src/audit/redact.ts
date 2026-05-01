/**
 * Argument redactor for audit logs (Plan 8 Phase E placeholder).
 *
 * Phase E ships a global redactor that strips a small set of obviously
 * sensitive top-level keys (`token`, `bearer_token`, `auth`, `password`,
 * `secret`) and truncates over-long string values to keep the audit
 * record bounded. **Per-tool sensitive-key maps land in Phase F** (e.g.
 * `webhooks_create.url`, `oauth_*.code`); the function signature here
 * already accepts the tool name so the Phase F drop-in is non-breaking.
 *
 * Redaction is shallow on purpose: nested objects pass through
 * untouched at this stage. The Phase F replacement walks recursively
 * with the per-tool key map merged in.
 *
 * Truncation policy: any string longer than `MAX_LEN` is shortened to
 * `TRUNCATE_TO` characters with the suffix `...[TRUNCATED]`. This caps
 * the size of message bodies, embed JSON, and long IDs so a single
 * audit record never blows up the log line.
 */

const SENSITIVE_KEYS = new Set(['token', 'bearer_token', 'auth', 'password', 'secret']);

const MAX_LEN = 200;
const TRUNCATE_TO = 100;
const TRUNCATE_SUFFIX = '...[TRUNCATED]';
const REDACTED = '[REDACTED]';

function truncateString(value: string): string {
  if (value.length <= MAX_LEN) return value;
  return value.slice(0, TRUNCATE_TO) + TRUNCATE_SUFFIX;
}

/**
 * @param args      Tool arguments as received by the middleware (already
 *                  validated). Always treated as a plain object — non-object
 *                  inputs return an empty record.
 * @param _toolName Reserved for the Phase F per-tool key map. Unused in
 *                  Phase E (placeholder global redactor only).
 */
export function redactArgs(args: unknown, _toolName: string): Record<string, unknown> {
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
      continue;
    }
    if (typeof value === 'string') {
      out[key] = truncateString(value);
      continue;
    }
    // Non-string scalars and nested objects pass through unchanged in
    // Phase E. Phase F walks recursively.
    out[key] = value;
  }
  return out;
}
