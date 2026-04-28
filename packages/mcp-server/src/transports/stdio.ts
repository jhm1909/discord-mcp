import { buildServer, createGatewayClient, createLogger, loadConfig, type GatewayClient } from '@discord-mcp/core';
import { REST } from '@discordjs/rest';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function startStdio(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const rest = new REST({ version: '10' }).setToken(
    // Discord REST does not want the "Bot " prefix here — discord.js's REST adds it.
    config.DISCORD_TOKEN.startsWith('Bot ') ? config.DISCORD_TOKEN.slice(4) : config.DISCORD_TOKEN,
  );

  const { server, registeredTools, notifyResource, subscriptions } = await buildServer({ rest, logger, config });

  let gatewayClient: GatewayClient | null = null;
  if (config.GATEWAY) {
    gatewayClient = createGatewayClient({
      token: config.DISCORD_TOKEN.startsWith('Bot ') ? config.DISCORD_TOKEN.slice(4) : config.DISCORD_TOKEN,
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

  logger.info({ tools: registeredTools.length, gateway: gatewayClient !== null }, 'discord-mcp ready (stdio)');

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
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
