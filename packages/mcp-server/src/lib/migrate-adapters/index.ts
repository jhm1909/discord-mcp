/**
 * Registry of all known migration adapters — Plan 9 Phase E + Plan 11.
 *
 * `migrate` reads this array exclusively; no other module imports an
 * adapter implementation directly. To add a new source: implement
 * {@link MigrationSource} in a new file under this directory, register
 * the singleton here, and add a test.
 *
 * Plan 9 Phase E shipped the Hubdustry adapter as a reference
 * implementation (its tools are non-Discord — intentionally produces
 * "0 mapped, 8 unmapped, 0 manual review" against a real Hubdustry tree).
 * Plan 11 Phase B adds the PaSympa adapter — the first Discord-using
 * adapter with a real {@link NAME_MAP} covering ~91 tools across 14
 * modules. Future phases add quadslab, discord-ops, barryyip.
 */
import { hubdustryGoMcpAdapter } from './hubdustry-go-mcp.js';
import { pasympaAdapter } from './pasympa.js';
import { quadslabAdapter } from './quadslab.js';
import type { MigrationSource } from './types.js';

export const ALL_ADAPTERS: readonly MigrationSource[] = [
  hubdustryGoMcpAdapter,
  pasympaAdapter,
  quadslabAdapter,
  // Plan 11 also adds: discordOpsAdapter, barryyipAdapter
];

export type {
  ManualReviewItem,
  MappedTool,
  MigrationResult,
  MigrationSource,
} from './types.js';
