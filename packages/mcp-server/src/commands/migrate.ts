/**
 * `discord-mcp migrate` — Plan 9 Phase E.
 *
 * Replaces the Phase A placeholder. Drives the
 * {@link MigrationSource} registry: pick an adapter via `--from`,
 * detect it against `--source` (or cwd), and emit the resulting
 * {@link MigrationResult} via the shared {@link emitResult} surface.
 *
 * Exit code policy (per plan §E.6):
 *   - `0` — adapter ran AND every source tool was mapped (i.e.
 *     unmappedTools.length === 0 && manualReview.length === 0).
 *   - `1` — adapter ran but produced unmapped or manual-review items.
 *     This is a "successful run with work left" — the user is told to
 *     hand-edit the output, not that the migration failed.
 *   - `2` — couldn't run at all: missing/unknown `--from`, source not
 *     detected, IO failures inside the adapter.
 *
 * The command never imports adapter implementations directly; it only
 * reads {@link ALL_ADAPTERS}. New sources land via Plan 11 by adding
 * entries to the registry.
 */
import { ALL_ADAPTERS } from '../lib/migrate-adapters/index.js';
import { emitResult } from '../lib/output.js';

export interface MigrateOptions {
  from?: string;
  source?: string;
  json?: boolean;
}

export async function migrateAction(opts: MigrateOptions = {}): Promise<void> {
  const asJson = opts.json === true;

  // 1. No `--from` → list available adapters and exit 2.
  if (opts.from === undefined) {
    emitResult(
      {
        ok: false,
        exitCode: 2,
        summary: '--from <adapter-id> required',
        data: {
          available: ALL_ADAPTERS.map((a) => ({
            id: a.id,
            description: a.description,
          })),
        },
        details: [
          'Available adapters:',
          ...ALL_ADAPTERS.map((a) => `  ${a.id} — ${a.description}`),
        ],
        errors: ['use --from with one of the IDs above'],
      },
      asJson,
    );
    return;
  }

  // 2. Resolve the adapter. Unknown id → exit 2 with the available list.
  const adapter = ALL_ADAPTERS.find((a) => a.id === opts.from);
  if (adapter === undefined) {
    emitResult(
      {
        ok: false,
        exitCode: 2,
        summary: `unknown adapter: ${opts.from}`,
        data: {
          requested: opts.from,
          available: ALL_ADAPTERS.map((a) => a.id),
        },
        errors: [`use --from with one of: ${ALL_ADAPTERS.map((a) => a.id).join(', ')}`],
      },
      asJson,
    );
    return;
  }

  // 3. Resolve the source path (default to cwd) and run detect().
  //    `detect` MUST NOT throw per the adapter contract, so we don't
  //    wrap this — any throw is an honest internal bug worth surfacing.
  const sourcePath = opts.source ?? process.cwd();
  if (!(await adapter.detect(sourcePath))) {
    emitResult(
      {
        ok: false,
        exitCode: 2,
        summary: `source not detected at ${sourcePath}`,
        data: { adapter: adapter.id, sourcePath },
        errors: [
          `adapter ${adapter.id} did not match the source — check --source path`,
          `looked for adapter-specific markers in ${sourcePath}`,
        ],
      },
      asJson,
    );
    return;
  }

  // 4. Run the adapter and report the result.
  const result = await adapter.migrate(sourcePath);
  const total =
    result.mappedTools.length + result.unmappedTools.length + result.manualReview.length;

  // Exit code: 0 only when every tool mapped cleanly. Unmapped or manual
  // review still counts as "ran successfully with work left" → exit 1.
  const exitCode: 0 | 1 | 2 =
    result.unmappedTools.length === 0 && result.manualReview.length === 0 ? 0 : 1;

  emitResult(
    {
      ok: exitCode === 0,
      exitCode,
      summary: `${result.mappedTools.length}/${total} mapped, ${result.unmappedTools.length} unmapped, ${result.manualReview.length} manual review`,
      data: { result },
      details: [
        `Adapter: ${result.source}`,
        `Source path: ${result.sourcePath}`,
        `Mapped (${result.mappedTools.length}):`,
        ...result.mappedTools.map((m) => `  ${m.original} → ${m.mapped} [${m.confidence}]`),
        `Unmapped (${result.unmappedTools.length}):`,
        ...result.unmappedTools.map((u) => `  ${u}`),
        `Manual review (${result.manualReview.length}):`,
        ...result.manualReview.map((m) => `  ${m.original}: ${m.reason}`),
      ],
      warnings: [...result.warnings],
    },
    asJson,
  );
}
