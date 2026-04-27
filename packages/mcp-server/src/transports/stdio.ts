import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { REST } from '@discordjs/rest';
import { buildServer, loadConfig, createLogger } from '@discord-mcp/core';

export async function startStdio(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const rest = new REST({ version: '10' }).setToken(
    // Discord REST does not want the "Bot " prefix here — discord.js's REST adds it.
    config.DISCORD_TOKEN.startsWith('Bot ') ? config.DISCORD_TOKEN.slice(4) : config.DISCORD_TOKEN,
  );

  const { server, registeredTools } = await buildServer({ rest, logger, config });
  logger.info({ tools: registeredTools.length }, 'discord-mcp ready (stdio)');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
