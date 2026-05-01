#!/usr/bin/env node
/**
 * discord-mcp CLI entry point.
 *
 * Plan 9 Phase A: commander sub-command router.
 * - `serve` is the default sub-command (`isDefault: true`) so a bare
 *   `discord-mcp` invocation still boots the stdio MCP server.
 * - `--gateway` lives on `serve`. Bare `discord-mcp --gateway` is
 *   forwarded to `serve` through commander's default-subcommand passthrough.
 * - `doctor`, `init`, `migrate` are placeholders that print
 *   "not yet implemented (Plan 9 Phase X)" and set process.exitCode = 2.
 *   They are wired now so the option shapes are stable for Phases B/C/D.
 * - Doctor / init / migrate handlers are lazy-imported (`await import(...)`)
 *   so cold-start for `serve` (the hot path) is unaffected by their deps.
 *
 * `program` is exported so tests can drive `parseAsync` without spawning
 * a child process. Auto-parse is suppressed under VITEST so tests can
 * call `parseAsync(['node', 'cli.js', ...args])` with synthetic argv.
 */
import { Command } from 'commander';
import packageJson from '../package.json' with { type: 'json' };
import { serveAction } from './commands/serve.js';

export const program = new Command('discord-mcp')
  .description('Discord MCP server — stdio transport for AI agents')
  .version(packageJson.version);

program
  .command('serve', { isDefault: true })
  .description('Start the stdio MCP server (default)')
  .option('--gateway', 'Enable Discord Gateway resource subscriptions (lazy-imports discord.js)')
  .action(async (options: { gateway?: boolean }) => {
    await serveAction(options);
  });

program
  .command('doctor')
  .description('Diagnose configuration, token, and connectivity issues')
  .option('--json', 'Emit machine-readable JSON instead of pretty output')
  .option('--online', 'Run online checks against Discord (requires DISCORD_TOKEN)')
  .action(async (options: { json?: boolean; online?: boolean }) => {
    const { doctorAction } = await import('./commands/doctor.js');
    await doctorAction(options);
  });

program
  .command('init')
  .description('Generate a starter mcp.json config and .env scaffold')
  .action(async () => {
    const { initAction } = await import('./commands/init.js');
    await initAction();
  });

program
  .command('migrate')
  .description('Migrate older configs / mcp.json shapes to the current format')
  .action(async () => {
    const { migrateAction } = await import('./commands/migrate.js');
    await migrateAction();
  });

// Run the parser only when invoked as the bin script (not when imported
// from tests). Vitest sets VITEST=true for every worker; we use it to
// suppress auto-parse during unit tests, which import `program` and
// drive parseAsync directly with synthetic argv.
if (process.env.VITEST !== 'true') {
  await program.parseAsync(process.argv);
}
