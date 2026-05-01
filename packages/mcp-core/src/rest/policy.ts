import {
  DelegateBackoff,
  decorrelatedJitterGenerator,
  ExponentialBackoff,
  fullJitterGenerator,
  handleType,
  type IPolicy,
  type IRetryBackoffContext,
  noJitterGenerator,
  retry,
  TimeoutStrategy,
  timeout,
  wrap,
} from 'cockatiel';
import type { Config } from '../config.js';
import { DiscordRetryableError } from './errors.js';

/**
 * Build the composite resilience policy for Discord REST calls.
 *
 * Layout (outer → inner):
 *   retry(handleType(DiscordRetryableError))   ← only when MCP_RETRY_ENABLED
 *     └─ timeout(MCP_TIMEOUT_DEFAULT_MS, Aggressive)
 *
 * The retry layer matches `DiscordRetryableError` (set by the resilient REST
 * adapter via `classifyDiscordError`). Backoff is a `DelegateBackoff` that:
 *   - honors `retryAfterMs` when present on the last error (Discord 429),
 *   - otherwise samples a configured `ExponentialBackoff`.
 *
 * When MCP_RETRY_ENABLED is false we return the bare timeout policy so the
 * outer adapter can still apply request-level timeouts without retry.
 */
export function buildPolicy(config: Config): IPolicy {
  const timeoutPolicy = timeout(config.MCP_TIMEOUT_DEFAULT_MS, TimeoutStrategy.Aggressive);

  if (!config.MCP_RETRY_ENABLED) {
    return timeoutPolicy as unknown as IPolicy;
  }

  // Pre-build an exponential backoff using the configured jitter strategy.
  // We sample its `next()` for the no-Retry-After branch in the delegate.
  const exponential = (() => {
    if (config.MCP_RETRY_JITTER === 'decorrelated') {
      return new ExponentialBackoff({
        initialDelay: config.MCP_RETRY_BASE_DELAY_MS,
        maxDelay: config.MCP_RETRY_MAX_DELAY_MS,
        exponent: 2,
        generator: decorrelatedJitterGenerator,
      });
    }
    return new ExponentialBackoff<number>({
      initialDelay: config.MCP_RETRY_BASE_DELAY_MS,
      maxDelay: config.MCP_RETRY_MAX_DELAY_MS,
      exponent: 2,
      generator: config.MCP_RETRY_JITTER === 'none' ? noJitterGenerator : fullJitterGenerator,
    });
  })();

  // Custom backoff: prefer Retry-After when known, otherwise delegate to
  // exponential.  cockatiel's `DelegateBackoff` returns either a raw number
  // (delay-only) or `{ delay, state }`.
  const customBackoff = new DelegateBackoff<IRetryBackoffContext<unknown>>((ctx) => {
    const err = 'error' in ctx.result ? ctx.result.error : undefined;
    if (err instanceof DiscordRetryableError && err.retryAfterMs !== null) {
      return { delay: err.retryAfterMs, state: undefined };
    }
    // Sample the exponential generator for the next delay.
    const gen = exponential.next();
    return { delay: gen.duration, state: undefined };
  });

  const retryPolicy = retry(handleType(DiscordRetryableError), {
    maxAttempts: config.MCP_RETRY_MAX_ATTEMPTS,
    backoff: customBackoff,
  });

  return wrap(retryPolicy, timeoutPolicy) as unknown as IPolicy;
}
