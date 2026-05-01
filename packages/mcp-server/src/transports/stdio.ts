import {
  buildPolicy,
  buildServer,
  createGatewayClient,
  createLogger,
  type GatewayClient,
  loadConfig,
  wrapRestWithResilience,
} from '@discord-mcp/core';
import { REST } from '@discordjs/rest';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { type OtelHandle, startOtel } from '../otel.js';

export async function startStdio(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);

  // Boot OTel BEFORE buildServer so global tracer/meter providers exist
  // by the time the telemetry middleware fetches them. Returns null when
  // OTEL_ENABLED is false (default), preserving v0.7.0 behavior.
  const otel: OtelHandle | null = startOtel(config);
  if (otel !== null) {
    logger.info({ otel: 'enabled' }, 'OpenTelemetry SDK started');
  }

  // `retries: 0` is non-negotiable here. Plan 8 §13 risk register: cockatiel
  // owns retry semantics from this point on; leaving the default (3) would
  // double-retry on 5xx and stack delays on 429.
  const baseRest = new REST({ version: '10', retries: 0 }).setToken(
    // Discord REST does not want the "Bot " prefix here — discord.js's REST adds it.
    config.DISCORD_TOKEN.startsWith('Bot ') ? config.DISCORD_TOKEN.slice(4) : config.DISCORD_TOKEN,
  );

  // Wrap the rate-limit-queue-aware REST in cockatiel's resilience policy
  // (timeout + retry-on-DiscordRetryableError + circuit breaker + bulkhead).
  // Passing `logger` enables circuit/bulkhead/dead-letter hook logs.
  const rest = wrapRestWithResilience(baseRest, buildPolicy(config, logger));

  const { server, registeredTools, notifyResource, subscriptions } = await buildServer({
    rest,
    logger,
    config,
  });

  let gatewayClient: GatewayClient | null = null;
  if (config.GATEWAY) {
    gatewayClient = createGatewayClient({
      token: config.DISCORD_TOKEN.startsWith('Bot ')
        ? config.DISCORD_TOKEN.slice(4)
        : config.DISCORD_TOKEN,
      registry: subscriptions,
      notifyResource,
    });
    try {
      await gatewayClient.start();
      logger.info({ gateway: 'enabled' }, 'Discord Gateway connected');
    } catch (e) {
      logger.warn(
        { err: e instanceof Error ? e.message : String(e) },
        'Discord Gateway failed to start — continuing in REST-only mode',
      );
      gatewayClient = null;
    }
  }

  logger.info(
    { tools: registeredTools.length, gateway: gatewayClient !== null },
    'discord-mcp ready (stdio)',
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    if (gatewayClient !== null) {
      try {
        await gatewayClient.stop();
      } catch (e) {
        logger.warn({ err: e instanceof Error ? e.message : String(e) }, 'gateway stop failed');
      }
    }
    await server.close();
    if (otel !== null) {
      try {
        await otel.shutdown();
      } catch (e) {
        logger.warn({ err: e instanceof Error ? e.message : String(e) }, 'otel shutdown failed');
      }
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
