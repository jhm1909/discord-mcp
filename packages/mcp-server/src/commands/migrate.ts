/**
 * `discord-mcp migrate` — placeholder for Plan 9 Phase D.
 *
 * Phase A wires up the sub-command surface. Phase D will diff
 * legacy mcp.json shapes against the current schema and rewrite
 * in place (with a .bak fallback).
 */
export async function migrateAction(): Promise<void> {
  process.stdout.write('discord-mcp migrate: not yet implemented (Plan 9 Phase D)\n');
  process.exitCode = 2;
}
