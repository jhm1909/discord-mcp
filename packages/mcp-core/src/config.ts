import { z } from 'zod';

// Helper for truthy env strings — matches Plan 8 §5 boolean env-string convention.
const boolish = (def = false) =>
  z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true' || v === 'yes')
    .default(def);

const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(50, 'DISCORD_TOKEN appears too short to be a valid bot token'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  GATEWAY: boolish(false),

  // --- OpenTelemetry (Plan 8 Phase A) ---
  // Master switch. When false, mcp-server skips SDK boot entirely (default behavior).
  OTEL_ENABLED: boolish(false),
  OTEL_SERVICE_NAME: z.string().default('discord-mcp'),
  OTEL_SERVICE_VERSION: z.string().default('0.8.0'),
  // OTLP collector endpoint (e.g. http://localhost:4318). Optional — when unset
  // the SDK still boots (if OTEL_CONSOLE_EXPORTER=true) or stays inert.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z
    .enum(['http/protobuf', 'http/json', 'grpc'])
    .default('http/protobuf'),
  // Comma-separated key=value pairs, e.g. "api-key=abc,env=prod".
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_TRACES_SAMPLER: z
    .enum([
      'always_on',
      'always_off',
      'traceidratio',
      'parentbased_always_on',
      'parentbased_always_off',
      'parentbased_traceidratio',
    ])
    .default('parentbased_always_on'),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().min(0).max(1).default(1),
  // Pipe spans to stdout (debug aid). Honours JSON-RPC by routing to stderr in caller.
  OTEL_CONSOLE_EXPORTER: boolish(false),

  // --- Resilience (Plan 8 Phase C) ---
  // Retry is ON by default. Boolean transform uses `!== 'false'` so anything
  // other than the literal string 'false' (including unset → undefined) is true.
  MCP_RETRY_ENABLED: z
    .string()
    .transform((v) => v !== 'false')
    .default(true),
  MCP_RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  MCP_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(50).max(5000).default(200),
  MCP_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(500).max(60000).default(10000),
  MCP_RETRY_JITTER: z.enum(['none', 'full', 'decorrelated']).default('full'),
  MCP_TIMEOUT_DEFAULT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  MCP_TIMEOUT_LONG_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
