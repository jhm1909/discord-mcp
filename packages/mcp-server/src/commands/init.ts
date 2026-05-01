/**
 * `discord-mcp init` — placeholder for Plan 9 Phase C.
 *
 * Phase A wires up the sub-command surface. Phase C will scaffold
 * mcp.json + .env from interactive prompts (no `inquirer` dep —
 * we'll roll a tiny readline helper to keep the zero-deps rule).
 */
export async function initAction(): Promise<void> {
  process.stdout.write('discord-mcp init: not yet implemented (Plan 9 Phase C)\n');
  process.exitCode = 2;
}
