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
import { z } from 'zod';

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
// Tool MDX renderer
// ---------------------------------------------------------------------------

/**
 * Tool descriptions follow the established 4-section format used across the
 * 192 tools. Headings are bold-asterisk markdown — capture body text up to
 * the next bold-asterisk heading or end of string.
 */
export function parseDescription(desc: string): {
  purpose: string;
  whenToUse: string;
  whenNotToUse: string;
  returns: string;
} {
  const sections = { purpose: '', whenToUse: '', whenNotToUse: '', returns: '' };

  const sectionRegex = /\*\*([^*]+)\*\*:\s*([\s\S]*?)(?=\n\s*\*\*[^*]+\*\*:|$)/g;
  for (const m of desc.matchAll(sectionRegex)) {
    const heading = (m[1] ?? '').trim().toLowerCase();
    const body = (m[2] ?? '').trim();
    if (heading === 'purpose') sections.purpose = body;
    else if (heading === 'when to use') sections.whenToUse = body;
    else if (heading === 'when not to use') sections.whenNotToUse = body;
    else if (heading === 'returns') sections.returns = body;
  }

  return sections;
}

/**
 * Escape characters MDX would interpret as JSX. Tool descriptions sometimes
 * contain `<channel_id>` placeholders or `{key:value}` examples that MDX
 * would otherwise try to parse as JSX expressions.
 */
export function escapeMdx(s: string): string {
  return s.replace(/</g, '\\<').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

export function renderSchemaTable(fields: Record<string, z.ZodTypeAny> | undefined): string {
  if (!fields || Object.keys(fields).length === 0) return '*(no fields)*';

  const objSchema = z.object(fields);
  let jsonSchema: {
    properties?: Record<
      string,
      { type?: string | string[]; description?: string; format?: string }
    >;
    required?: string[];
  };
  try {
    jsonSchema = z.toJSONSchema(objSchema, { target: 'draft-2020-12' }) as typeof jsonSchema;
  } catch (e) {
    return `*(schema introspection failed: ${e instanceof Error ? e.message : String(e)})*`;
  }

  const required = new Set(jsonSchema.required ?? []);
  const props = jsonSchema.properties ?? {};

  const rows: string[] = ['| Field | Type | Required | Description |', '|---|---|---|---|'];
  for (const [name, prop] of Object.entries(props)) {
    const type = Array.isArray(prop.type) ? prop.type.join(' \\| ') : (prop.type ?? 'unknown');
    const req = required.has(name) ? 'yes' : 'no';
    const description = (prop.description ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    rows.push(`| \`${name}\` | ${type} | ${req} | ${description} |`);
  }
  return rows.join('\n');
}

export function renderToolMdx(tool: ToolMetadata): string {
  const desc = parseDescription(tool.description);
  const inputTable = renderSchemaTable(tool.inputSchema);
  const outputTable = renderSchemaTable(tool.outputSchema);

  const sourceRelative = relative(ROOT, tool.sourcePath).replace(/\\/g, '/');
  const ghUrl = `https://github.com/cappylab/discord-mcp/blob/main/${sourceRelative}`;

  const fmDesc = desc.purpose.replace(/['"]/g, '').replace(/\n/g, ' ').slice(0, 150).trim();

  const a = tool.annotations;
  const requiresConfirm = tool.preconditions.includes('confirm_required');

  return `---
title: ${tool.name}
description: ${fmDesc}
---

import { Aside } from '@astrojs/starlight/components';

# \`${tool.name}\`

**Category**: ${tool.category}

<Aside type="tip">
This page is auto-generated from \`${sourceRelative}\`. Edit the source to update.
</Aside>

${escapeMdx(desc.purpose)}

## When to use

${escapeMdx(desc.whenToUse)}

## When NOT to use

${escapeMdx(desc.whenNotToUse)}

## Input

${inputTable}

## Returns

${escapeMdx(desc.returns)}

### Output schema

${outputTable}

## Annotations

| Property | Value |
|---|---|
| Read-only | ${a.readOnlyHint ? 'yes' : 'no'} |
| Destructive | ${a.destructiveHint ? 'yes' : 'no'} |
| Idempotent | ${a.idempotentHint ? 'yes' : 'no'} |
| Open-world | ${a.openWorldHint ? 'yes' : 'no'} |
| Confirmation required | ${requiresConfirm ? 'yes (`__confirm:true` required)' : 'no'} |

## Source

[\`${sourceRelative}\`](${ghUrl})
`;
}

// ---------------------------------------------------------------------------
// Orchestration (category indexes + main land in subsequent commits)
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
