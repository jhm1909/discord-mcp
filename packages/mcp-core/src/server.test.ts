import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

describe('buildServer', () => {
  it('registers tools and exposes them via list_tools', async () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'Bot fake.test.token-abcdefghijklmnopqrstuvwxyz1234567890',
      LOG_LEVEL: 'fatal',
    } as NodeJS.ProcessEnv);
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    const logger = createLogger(config);

    const { server, registeredTools } = await buildServer({ rest, logger, config });
    expect(server).toBeDefined();
    expect(registeredTools).toContain('messages_send');
    expect(registeredTools.length).toBeGreaterThanOrEqual(1);
  });
});
