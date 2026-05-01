import { type Counter, metrics } from '@opentelemetry/api';
import {
  bulkhead,
  ConsecutiveBreaker,
  circuitBreaker,
  DelegateBackoff,
  decorrelatedJitterGenerator,
  ExponentialBackoff,
  fullJitterGenerator,
  handleAll,
  handleType,
  type IPolicy,
  type IRetryBackoffContext,
  noJitterGenerator,
  retry,
  TimeoutStrategy,
  timeout,
  wrap,
} from 'cockatiel';
import type { Logger } from 'pino';
import type { Config } from '../config.js';
import {
  ATTR_CIRCUIT_TO_STATE,
  ATTR_ERROR_TYPE,
  METRIC_BULKHEAD_REJECTED,
  METRIC_CIRCUIT_TRANSITIONS,
  METRIC_DEADLETTER,
  TELEMETRY_INSTRUMENTATION_NAME,
  TELEMETRY_INSTRUMENTATION_VERSION,
} from '../telemetry/conventions.js';
import { DiscordRetryableError } from './errors.js';

/**
 * Build the composite resilience policy for Discord REST calls.
 *
 * Layout (outer → inner) when all features enabled:
 *   bulkhead(MCP_BULKHEAD_LIMIT, queueSize=0)              ← fast-reject when over limit
 *     └─ circuitBreaker(handleAll.orType(DiscordRetryableError),
 *                       ConsecutiveBreaker(MCP_CIRCUIT_FAILURE_THRESHOLD),
 *                       halfOpenAfter=MCP_CIRCUIT_HALF_OPEN_AFTER_MS)
 *          └─ retry(handleType(DiscordRetryableError))    ← MCP_RETRY_ENABLED
 *               └─ timeout(MCP_TIMEOUT_DEFAULT_MS, Aggressive)
 *
 * Composition rationale (Plan 8 §13 risk register):
 *   - Bulkhead is OUTERMOST so retries don't slip through bulkhead's accounting
 *     (one in-flight slot per logical user request, not per attempt).
 *   - Breaker is OUTSIDE retry so it sees aggregate behavior across retries.
 *     Each retry-exhausted call counts as ONE consecutive failure to the
 *     breaker, not N. Otherwise threshold semantics are misleading.
 *   - The breaker error filter mirrors the retry filter
 *     (`DiscordRetryableError`) so 4xx never increments the breaker counter
 *     — only true upstream/network failures do.
 *   - `queueSize: 0` on the bulkhead — DO NOT queue. Head-of-line blocking is
 *     worse than fast failure for an agent. The agent can re-issue.
 *
 * Pipeline self-deadlock note (Plan 8 §13):
 *   A pipeline runs N steps SEQUENTIALLY within a single MCP call. The
 *   bulkhead default of 100 leaves ample headroom. Operators who tighten
 *   `MCP_BULKHEAD_LIMIT` should keep ≥ 10 to avoid head-of-line stalls when
 *   pipelines fan out.
 *
 * Telemetry hooks (Plan 8 D.1 + D.3 + D.5):
 *   - breaker.onBreak / onHalfOpen / onReset
 *       → log + emit `mcp.circuit.transitions{to_state}` counter.
 *   - bulkhead.onReject
 *       → log + emit `mcp.bulkhead.rejected.count` counter.
 *   - <final policy>.onFailure
 *       → log dead-letter + emit `mcp.deadletter.count{error.type}` counter.
 *
 * Disabled paths:
 *   - `!MCP_RETRY_ENABLED`: skip retry, use `wrap(bulkhead?, breaker?, timeout)`.
 *   - `!MCP_CIRCUIT_ENABLED`: skip breaker. Hooks for breaker are also skipped.
 *   - Bulkhead is always present (cockatiel doesn't expose an off-switch and
 *     the limit defaults to 100 — effectively unbounded for stdio agents).
 *
 * @param config Loaded config — only the resilience fields are read.
 * @param logger Optional pino logger for hook observability. When omitted
 *               (test paths), hooks still emit OTel metrics.
 */
export function buildPolicy(config: Config, logger?: Logger): IPolicy {
  const timeoutPolicy = timeout(config.MCP_TIMEOUT_DEFAULT_MS, TimeoutStrategy.Aggressive);

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
  // exponential.
  const customBackoff = new DelegateBackoff<IRetryBackoffContext<unknown>>((ctx) => {
    const err = 'error' in ctx.result ? ctx.result.error : undefined;
    if (err instanceof DiscordRetryableError && err.retryAfterMs !== null) {
      return { delay: err.retryAfterMs, state: undefined };
    }
    const gen = exponential.next();
    return { delay: gen.duration, state: undefined };
  });

  const retryPolicy = retry(handleType(DiscordRetryableError), {
    maxAttempts: config.MCP_RETRY_MAX_ATTEMPTS,
    backoff: customBackoff,
  });

  // --- Telemetry: shared meter + counters (Plan 8 D.1 / D.3 / D.5) ---
  // OTel falls back to a no-op meter when no SDK is registered, so this is
  // safe even when OTEL_ENABLED=false.
  const meter = metrics.getMeter(TELEMETRY_INSTRUMENTATION_NAME, TELEMETRY_INSTRUMENTATION_VERSION);
  const circuitTransitions: Counter = meter.createCounter(METRIC_CIRCUIT_TRANSITIONS, {
    description: 'Circuit-breaker state transitions (open / half-open / closed)',
  });
  const bulkheadRejected: Counter = meter.createCounter(METRIC_BULKHEAD_REJECTED, {
    description: 'Bulkhead fast-reject count (over MCP_BULKHEAD_LIMIT)',
  });
  const deadletterCount: Counter = meter.createCounter(METRIC_DEADLETTER, {
    description: 'Terminal failures after retries exhausted, labelled by error.type',
  });

  // --- Circuit breaker (Plan 8 D.1) ---
  // Built only when MCP_CIRCUIT_ENABLED. The breaker handles
  // DiscordRetryableError so 4xx (already-non-retryable) doesn't poison
  // the failure counter.
  const breaker = config.MCP_CIRCUIT_ENABLED
    ? circuitBreaker(handleAll.orType(DiscordRetryableError), {
        halfOpenAfter: config.MCP_CIRCUIT_HALF_OPEN_AFTER_MS,
        breaker: new ConsecutiveBreaker(config.MCP_CIRCUIT_FAILURE_THRESHOLD),
      })
    : null;

  if (breaker !== null) {
    breaker.onBreak((reason) => {
      try {
        const err =
          'error' in reason
            ? reason.error
            : 'isolated' in reason
              ? new Error('isolated')
              : undefined;
        logger?.warn(
          { event: 'circuit_breaker_open', err: err?.message },
          'circuit breaker opened',
        );
        circuitTransitions.add(1, { [ATTR_CIRCUIT_TO_STATE]: 'open' });
      } catch {
        // Hooks must never throw out of cockatiel — swallow + continue.
      }
    });
    breaker.onHalfOpen(() => {
      try {
        logger?.info({ event: 'circuit_breaker_half_open' }, 'circuit breaker half-open (probing)');
        circuitTransitions.add(1, { [ATTR_CIRCUIT_TO_STATE]: 'half-open' });
      } catch {
        // ignore
      }
    });
    breaker.onReset(() => {
      try {
        logger?.info({ event: 'circuit_breaker_reset' }, 'circuit breaker reset to closed');
        circuitTransitions.add(1, { [ATTR_CIRCUIT_TO_STATE]: 'closed' });
      } catch {
        // ignore
      }
    });
  }

  // --- Bulkhead (Plan 8 D.2) ---
  // Always installed.  queueSize is hard-coded to 0 (fast-reject).
  const concurrencyLimit = bulkhead(config.MCP_BULKHEAD_LIMIT, /* queueSize */ 0);
  concurrencyLimit.onReject(() => {
    try {
      logger?.warn(
        { event: 'bulkhead_rejected', limit: config.MCP_BULKHEAD_LIMIT },
        'bulkhead capacity exceeded',
      );
      bulkheadRejected.add(1);
    } catch {
      // ignore
    }
  });

  // --- Compose ---
  // wrap(outer, …, inner). bulkhead OUTERMOST, then breaker, then retry, then timeout.
  type WrapInputs = Parameters<typeof wrap>;
  const layers: WrapInputs = [concurrencyLimit];
  if (breaker !== null) {
    layers.push(breaker as unknown as WrapInputs[number]);
  }
  if (config.MCP_RETRY_ENABLED) {
    layers.push(retryPolicy as unknown as WrapInputs[number]);
  }
  layers.push(timeoutPolicy as unknown as WrapInputs[number]);

  // Cast: cockatiel's `wrap` overloads cover up to 5 explicit args; we use
  // the variadic form which is typed as `IPolicy<C, A>` — fine for our use.
  const final = (wrap as (...p: WrapInputs) => IPolicy)(...layers);

  // --- Dead-letter telemetry (Plan 8 D.5) ---
  // onFailure on the OUTERMOST policy fires only for terminal failures —
  // i.e. after retries are exhausted (or there were no retries to start
  // with).  Transient failures handled by the retry layer DO NOT fire this.
  final.onFailure((evt) => {
    try {
      const err = 'error' in evt.reason ? evt.reason.error : undefined;
      const errorType = err?.constructor.name ?? typeof (evt.reason as { value?: unknown }).value;
      logger?.error(
        {
          event: 'dead_letter',
          tag: 'dead-letter',
          err: err?.message,
          error_type: errorType,
          handled: evt.handled,
          duration_ms: evt.duration,
        },
        'request reached dead-letter (retries exhausted or unrecoverable)',
      );
      deadletterCount.add(1, { [ATTR_ERROR_TYPE]: errorType });
    } catch {
      // ignore — telemetry must never crash the policy.
    }
  });

  return final;
}
