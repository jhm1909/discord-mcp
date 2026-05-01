/**
 * Registry of all known migration adapters — Plan 9 Phase E.
 *
 * `migrate` reads this array exclusively; no other module imports an
 * adapter implementation directly. To add a new source: implement
 * {@link MigrationSource} in a new file under this directory, register
 * the singleton here, and add a test.
 *
 * Phase E ships only the Hubdustry adapter as a reference implementation
 * (its tools are non-Discord — intentionally produces "0 mapped, 8
 * unmapped, 0 manual review" against a real Hubdustry tree). Plan 11
 * will add Discord-using adapters (PaSympa, quadslab, discord-ops,
 * barryyip).
 */
import type { MigrationSource } from './types.js';

export const ALL_ADAPTERS: readonly MigrationSource[] = [
  // E.2 adds the Hubdustry adapter as the first reference implementation.
  // Plan 11 adds: paSympaAdapter, quadslabAdapter, discordOpsAdapter, barryyipAdapter
];

export type {
  ManualReviewItem,
  MappedTool,
  MigrationResult,
  MigrationSource,
} from './types.js';
