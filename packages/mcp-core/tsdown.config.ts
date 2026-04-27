import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node20',
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@modelcontextprotocol/sdk', '@discordjs/rest', '@sapphire/pieces', 'pino', 'zod', 'discord-api-types'],
});
