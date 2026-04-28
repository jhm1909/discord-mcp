#!/usr/bin/env node
import { Command } from 'commander';
import { startStdio } from './transports/stdio.js';

const program = new Command('discord-mcp')
  .description('Discord MCP server — stdio transport for AI agents')
  .version('0.0.0')
  .option('--gateway', 'Enable Discord Gateway resource subscriptions (lazy-imports discord.js)')
  .action(async (options: { gateway?: boolean }) => {
    if (options.gateway === true) {
      process.env['GATEWAY'] = '1';
    }
    try {
      await startStdio();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`discord-mcp failed to start: ${msg}`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
