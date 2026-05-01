import { buildResource, type Config } from '@discord-mcp/core';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { type IMetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  ConsoleSpanExporter,
  ParentBasedSampler,
  type Sampler,
  type SpanExporter,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';

export interface OtelHandle {
  /** Flush all pending spans/metrics and detach the global providers. */
  shutdown: () => Promise<void>;
}

const SHUTDOWN_TIMEOUT_MS = 5_000;
const METRIC_EXPORT_INTERVAL_MS = 30_000;

/**
 * Parses a comma-separated `k=v` string into a header map.
 * Empty/whitespace pairs are skipped silently. Used for
 * OTEL_EXPORTER_OTLP_HEADERS.
 */
export function parseHeaders(s: string | undefined): Record<string, string> {
  if (s === undefined || s.trim() === '') return {};
  const out: Record<string, string> = {};
  for (const pair of s.split(',')) {
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const k = pair.slice(0, eq).trim();
    const v = pair.slice(eq + 1).trim();
    if (k.length > 0) out[k] = v;
  }
  return out;
}

function buildSampler(config: Config): Sampler {
  const arg = config.OTEL_TRACES_SAMPLER_ARG;
  switch (config.OTEL_TRACES_SAMPLER) {
    case 'always_on':
      return new AlwaysOnSampler();
    case 'always_off':
      return new AlwaysOffSampler();
    case 'traceidratio':
      return new TraceIdRatioBasedSampler(arg);
    case 'parentbased_always_off':
      return new ParentBasedSampler({ root: new AlwaysOffSampler() });
    case 'parentbased_traceidratio':
      return new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(arg) });
    case 'parentbased_always_on':
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
    default:
      return new ParentBasedSampler({ root: new AlwaysOnSampler() });
  }
}

function buildTraceExporter(config: Config): SpanExporter | null {
  if (config.OTEL_CONSOLE_EXPORTER) return new ConsoleSpanExporter();
  if (config.OTEL_EXPORTER_OTLP_ENDPOINT === undefined) return null;
  return new OTLPTraceExporter({
    url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    headers: parseHeaders(config.OTEL_EXPORTER_OTLP_HEADERS),
  });
}

function buildMetricReader(config: Config): IMetricReader | null {
  if (config.OTEL_EXPORTER_OTLP_ENDPOINT === undefined) return null;
  return new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
      headers: parseHeaders(config.OTEL_EXPORTER_OTLP_HEADERS),
    }),
    exportIntervalMillis: METRIC_EXPORT_INTERVAL_MS,
  });
}

/**
 * Boots the OpenTelemetry NodeSDK if `OTEL_ENABLED=true`, returns null
 * otherwise. The handle's `shutdown()` flushes spans and metrics with a
 * 5s timeout; callers (stdio transport) wire it to SIGTERM/SIGINT.
 *
 * Default behavior (OTEL_ENABLED unset) is identical to v0.7.0 — no
 * SDK boot, no global provider mutation.
 */
export function startOtel(config: Config): OtelHandle | null {
  if (!config.OTEL_ENABLED) return null;

  const traceExporter = buildTraceExporter(config);
  const metricReader = buildMetricReader(config);

  // If neither console nor OTLP is configured we still register the SDK
  // so the global tracer/meter providers exist (the middleware will use
  // them as no-op recorders). This keeps tool spans coherent in dev.
  const sdk = new NodeSDK({
    resource: buildResource(config),
    sampler: buildSampler(config),
    ...(traceExporter !== null && { traceExporter }),
    ...(metricReader !== null && { metricReaders: [metricReader] }),
  });

  sdk.start();

  return {
    shutdown: async () => {
      await Promise.race([
        sdk.shutdown(),
        new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
      ]);
    },
  };
}
