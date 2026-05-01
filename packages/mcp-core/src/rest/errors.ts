import { DiscordAPIError, HTTPError, RateLimitError } from '@discordjs/rest';

/**
 * Marker error wrapping any retryable upstream condition (5xx, 429,
 * specific network-level resets) so cockatiel can match it via
 * `handleType(DiscordRetryableError)` / `orType` in the composite
 * policy.  See `policy.ts`.
 *
 * Holds:
 *  - `cause`: the original thrown error from `@discordjs/rest`.  Re-thrown
 *    by the resilient adapter once retries are exhausted.
 *  - `retryAfterMs`: when the upstream signaled a specific wait (e.g. a
 *    Discord 429 with `Retry-After`), in milliseconds.  `null` for 5xx
 *    and network errors where we fall back to exponential backoff.
 */
export class DiscordRetryableError extends Error {
  public override readonly cause: unknown;
  public readonly retryAfterMs: number | null;

  public constructor(cause: unknown, retryAfterMs: number | null) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    super(`Retryable upstream error: ${causeMsg}`);
    this.name = 'DiscordRetryableError';
    this.cause = cause;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Network-level error codes we treat as retryable. */
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'EPIPE',
]);

/**
 * Inspect an arbitrary thrown value and decide whether it represents a
 * retryable upstream condition.  Returns a `DiscordRetryableError` (so
 * cockatiel matches via `orType`) or `null` for non-retryable errors
 * (4xx other than 429, validation errors, etc).
 *
 * Handles three classes:
 *  1. `RateLimitError` (Discord 429, surfaced by `@discordjs/rest` when
 *     `rejectOnRateLimit` matches the route — currently unused in our
 *     setup, but supported for completeness).
 *  2. `DiscordAPIError` with `status >= 500`. 4xx (auth, permission,
 *     not-found, validation) is non-retryable and falls through.
 *  3. `HTTPError` (low-level fetch failure with a status, e.g. transparent
 *     proxy 502s) when status is 5xx.
 *  4. Plain `Error` whose `code` matches a known retryable network code.
 */
export function classifyDiscordError(err: unknown): DiscordRetryableError | null {
  // --- 429: rate limit ---
  if (err instanceof RateLimitError) {
    // RateLimitError.retryAfter is in milliseconds per @discordjs/rest 2.x docs.
    return new DiscordRetryableError(err, err.retryAfter);
  }

  // --- DiscordAPIError: only 5xx are retryable ---
  if (err instanceof DiscordAPIError) {
    if (err.status >= 500 && err.status < 600) {
      return new DiscordRetryableError(err, null);
    }
    // Some Discord 4xx responses include a 429 status — handle defensively.
    if (err.status === 429) {
      // The body may carry retry_after seconds; convert to ms.
      const raw = (err.rawError as { retry_after?: number } | undefined)?.retry_after;
      const retryAfterMs = typeof raw === 'number' ? Math.round(raw * 1000) : null;
      return new DiscordRetryableError(err, retryAfterMs);
    }
    return null;
  }

  // --- HTTPError: low-level fetch / proxy failure ---
  if (err instanceof HTTPError) {
    if (err.status >= 500 && err.status < 600) {
      return new DiscordRetryableError(err, null);
    }
    return null;
  }

  // --- Network-level: ECONNRESET / ETIMEDOUT / ENOTFOUND / etc ---
  if (err instanceof Error) {
    const code = (err as Error & { code?: unknown }).code;
    if (typeof code === 'string' && RETRYABLE_NETWORK_CODES.has(code)) {
      return new DiscordRetryableError(err, null);
    }
    // undici wraps low-level errors in `cause` — peek one level deep.
    const inner = (err as Error & { cause?: unknown }).cause;
    if (inner instanceof Error) {
      const innerCode = (inner as Error & { code?: unknown }).code;
      if (typeof innerCode === 'string' && RETRYABLE_NETWORK_CODES.has(innerCode)) {
        return new DiscordRetryableError(err, null);
      }
    }
  }

  return null;
}
