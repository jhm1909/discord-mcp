import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node20',
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    '@modelcontextprotocol/sdk',
    '@discordjs/rest',
    '@sapphire/pieces',
    'pino',
    'zod',
    'discord-api-types',
  ],
});
