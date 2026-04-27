import pino, { type Logger } from 'pino';
import type { Config } from './config.js';

export function createLogger(config: Config): Logger {
  return pino(
    { level: config.LOG_LEVEL },
    pino.destination(2), // stderr — stdio reserves stdout for JSON-RPC
  );
}
