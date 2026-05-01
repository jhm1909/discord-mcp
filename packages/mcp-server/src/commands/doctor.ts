/**
 * `discord-mcp doctor` — placeholder for Plan 9 Phase B.
 *
 * Phase A wires up the sub-command surface so the option shape
 * (--json / --online) is stable. Phase B will implement the
 * actual offline + online checks (env, token, REST handshake,
 * gateway readiness) and emit a CommandResult via emitResult().
 */
export interface DoctorOptions {
  json?: boolean;
  online?: boolean;
}

export async function doctorAction(_options: DoctorOptions): Promise<void> {
  process.stdout.write('discord-mcp doctor: not yet implemented (Plan 9 Phase B)\n');
  process.exitCode = 2;
}
