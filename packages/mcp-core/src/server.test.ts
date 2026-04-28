import { REST } from '@discordjs/rest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { buildServer } from './server.js';

describe('buildServer', () => {
  it('auto-discovers tools from src/tools and registers preconditions', async () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      LOG_LEVEL: 'fatal',
    } as NodeJS.ProcessEnv);
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    const logger = createLogger(config);

    const { server, registeredTools, registeredPreconditions } = await buildServer({
      rest,
      logger,
      config,
    });
    expect(server).toBeDefined();
    expect(registeredTools.length).toBeGreaterThanOrEqual(1);
    expect(registeredTools).toContain('messages_send');
    expect(registeredPreconditions).toContain('category_enabled');
    expect(registeredPreconditions).toContain('confirm_required');
  });
});
