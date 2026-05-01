/**
 * Auto-generate the tools reference section of the docs site.
 *
 * Reads the static `__toolMetadata` attached to every class returned by
 * `defineTool()` (see packages/mcp-core/src/tools/_lib/defineTool.ts) via
 * dynamic `import()` of each tool source file. Renders one MDX page per
 * tool, one index per category, and a top-level tools index — 192 + 28 + 1
 * pages total.
 *
 * Run via `pnpm --filter site generate-tools`. Requires `tsx` to register
 * the TypeScript loader for dynamic .ts imports.
 */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { z } from 'zod';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '../..');
const TOOLS_DIR = join(ROOT, 'packages/mcp-core/src/tools');

export interface ToolMetadata {
  name: string;
  category: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  outputSchema: Record<string, z.ZodTypeAny> | undefined;
  annotations: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  idempotent: boolean;
  preconditions: readonly string[];
  sourcePath: string;
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export async function loadAllTools(toolsDir: string = TOOLS_DIR): Promise<ToolMetadata[]> {
  const tools: ToolMetadata[] = [];
  const categories = readdirSync(toolsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name);

  for (const category of categories) {
    const categoryDir = join(toolsDir, category);
    const files = readdirSync(categoryDir).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('_'),
    );
    for (const file of files) {
      const sourcePath = join(categoryDir, file);
      const moduleUrl = `file://${sourcePath.replace(/\\/g, '/')}`;
      try {
        const mod = await import(moduleUrl);
        const toolClass = mod.default;
        const metadata = (toolClass as { __toolMetadata?: unknown })?.__toolMetadata;
        if (!metadata || typeof metadata !== 'object') {
          console.warn(`[skip] ${relative(ROOT, sourcePath)} — no __toolMetadata`);
          continue;
        }
        const m = metadata as Record<string, unknown>;
        tools.push({
          name: m.name as string,
          category: m.category as string,
          description: m.description as string,
          inputSchema: m.inputSchema as Record<string, z.ZodTypeAny>,
          outputSchema: m.outputSchema as Record<string, z.ZodTypeAny> | undefined,
          annotations: m.annotations as ToolMetadata['annotations'],
          idempotent: (m.idempotent as boolean) ?? false,
          preconditions: (m.preconditions as readonly string[]) ?? [],
          sourcePath,
        });
      } catch (e) {
        console.warn(
          `[error] ${relative(ROOT, sourcePath)}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }
  return tools;
}

// ---------------------------------------------------------------------------
// Orchestration (renderers + main land in subsequent commits)
// ---------------------------------------------------------------------------

async function main() {
  const tools = await loadAllTools();
  console.log(`[generate-tool-docs] loaded ${tools.length} tools`);
  if (tools.length < 190) {
    console.error(`[generate-tool-docs] FATAL: expected >= 190 tools, got ${tools.length}`);
    process.exit(1);
  }
}

const invokedAsMain = (() => {
  if (!process.argv[1]) return false;
  try {
    const argvUrl = new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
    return import.meta.url === argvUrl;
  } catch {
    return false;
  }
})();

if (invokedAsMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
