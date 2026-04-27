import type { REST } from '@discordjs/rest';
import type { Logger } from 'pino';
import type { Config } from './config.js';

declare module '@sapphire/pieces' {
  interface Container {
    rest: REST;
    logger: Logger;
    config: Config;
  }
}
