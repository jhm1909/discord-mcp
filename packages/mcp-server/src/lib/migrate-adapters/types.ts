/**
 * Migration adapter pattern — Plan 9 Phase E.
 *
 * A {@link MigrationSource} represents one supported "source" project
 * shape (e.g. the Hubdustry Go MCP server, a legacy discord-bot config).
 * Each adapter knows how to:
 *
 *   1. {@link MigrationSource.detect} — answer "is this filesystem a
 *      project I understand?" without throwing on missing files.
 *   2. {@link MigrationSource.migrate} — walk the source tree and emit
 *      a {@link MigrationResult} listing tools mapped onto discord-mcp,
 *      tools that have no equivalent yet (`unmappedTools`), and items
 *      that need a human eye (`manualReview`).
 *
 * The `migrate` command iterates this pattern: it never imports an
 * adapter implementation directly — it only consumes the registry in
 * `./index.ts`. Plan 11 will add Discord-using adapters
 * (PaSympa / quadslab / discord-ops / barryyip) without touching this
 * type or the command surface.
 */

/**
 * One supported source project shape.
 *
 * Adapters are pure: `detect` and `migrate` MUST NOT mutate the
 * filesystem under `rootPath` and MUST NOT spawn child processes.
 * They are allowed to read files and walk directories.
 */
export interface MigrationSource {
  /** Stable kebab-case identifier passed via `--from <id>`. */
  readonly id: string;
  /** Single-line human-readable description shown in `--help` listing. */
  readonly description: string;
  /**
   * Return true if `rootPath` looks like this kind of source. MUST NOT
   * throw — wrap fs ops in try/catch and return false on missing paths.
   */
  detect(rootPath: string): Promise<boolean>;
  /**
   * Walk the source tree and produce a {@link MigrationResult}. May
   * surface non-fatal issues via `warnings`; throw only on truly
   * unrecoverable IO errors (the caller turns those into exit code 2).
   */
  migrate(rootPath: string): Promise<MigrationResult>;
}

/**
 * One source tool successfully mapped onto a discord-mcp equivalent.
 *
 * `confidence` is the adapter's self-assessment:
 *   - `high`   — name + arg shape are a 1:1 match.
 *   - `medium` — name matches but args may need tweaking.
 *   - `low`    — best-guess; user MUST verify.
 */
export interface MappedTool {
  readonly original: string;
  readonly mapped: string;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly notes?: string;
}

/**
 * One source tool that the adapter recognised but couldn't auto-map.
 * The `reason` explains why and `suggestion` (if any) names the
 * discord-mcp tool a human should look at first.
 */
export interface ManualReviewItem {
  readonly original: string;
  readonly reason: string;
  readonly suggestion?: string;
}

/**
 * Result of running an adapter against a source path.
 *
 * `mappedTools` + `unmappedTools` + `manualReview` sum to the total
 * number of source tools the adapter found. `unmappedTools` is allowed
 * to be non-empty — that's still a valid run (exit code 1, not 2).
 *
 * `warnings` carries non-blocking notices (e.g. "no tools found in
 * fixture", "regex may have missed multi-line calls").
 */
export interface MigrationResult {
  readonly source: string;
  readonly sourcePath: string;
  readonly mappedTools: readonly MappedTool[];
  readonly unmappedTools: readonly string[];
  readonly manualReview: readonly ManualReviewItem[];
  readonly warnings: readonly string[];
}
