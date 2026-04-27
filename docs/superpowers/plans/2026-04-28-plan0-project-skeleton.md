# Plan 0 — Project Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the discord-mcp monorepo with `@sapphire/pieces` registry, stdio transport, and one working tool (`messages_send`) end-to-end so we can `npx -y @discord-mcp/cli` from a fresh checkout and post a Discord message.

**Architecture:** pnpm workspace with two packages — `mcp-core` (registry, tools, transport-agnostic logic) and `mcp-server` (CLI + stdio binary). `@sapphire/pieces` Container declaration-merged singleton + Store auto-discovers `src/tools/**/*.ts`. `defineTool()` factory returns Sapphire Piece subclasses. `@discordjs/rest` for Discord HTTP, no Gateway client v0. zod 4 for input/output schemas.

**Tech Stack:** Node ≥20.11 (ESM), TypeScript 5.x strict NodeNext, `@modelcontextprotocol/sdk@^1.20`, `@discordjs/rest@^2`, `discord-api-types@^0.38`, `zod@^4`, `@sapphire/pieces@latest`, `pino@^9`, `tsdown` (Rolldown), `vitest@^3.2`, `msw@^2.7`, `biome@^2`, `pnpm@^9.15`, `turbo@^2`.

**Outcome of this plan:** A repo where `pnpm install && pnpm build && DISCORD_TOKEN=... node packages/mcp-server/dist/cli.js` starts a stdio MCP server exposing `messages_send`, callable via `@modelcontextprotocol/inspector`, with passing unit + protocol-contract tests in CI.

**Out of scope:** all other 174 tools, middleware chain (errors/audit/retry/breaker), Components V2, pipeline executor, intelligence tools, resource subscriptions, telemetry stack, distribution polish, docs site. Those land in Plans 1+.

---

## File Structure (created by this plan)

```
discord-mcp/
├── package.json                            # workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── biome.json
├── .gitignore
├── .npmrc
├── README.md
├── LICENSE
├── .github/
│   └── workflows/
│       └── ci.yml
├── packages/
│   ├── mcp-core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsdown.config.ts
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                    # public exports
│   │       ├── server.ts                   # buildServer({rest,logger,config}) → McpServer
│   │       ├── container.ts                # @sapphire/pieces Container declaration-merged
│   │       ├── config.ts                   # zod-validated env loader
│   │       ├── logger.ts                   # pino → stderr
│   │       ├── pieces/
│   │       │   └── Tool.ts                 # base class extends Piece
│   │       ├── stores/
│   │       │   └── ToolStore.ts            # Sapphire Store<Tool>
│   │       ├── tools/
│   │       │   ├── _lib/
│   │       │   │   ├── defineTool.ts       # factory → Tool subclass
│   │       │   │   ├── snowflake.ts        # branded type + zod
│   │       │   │   └── response.ts         # dualResult helper
│   │       │   └── messages/
│   │       │       ├── send.ts             # messages_send tool
│   │       │       └── send.test.ts        # unit test (msw mocked)
│   │       └── transports/
│   │           └── inMemory.ts             # re-export SDK helper for tests
│   └── mcp-server/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsdown.config.ts
│       └── src/
│           ├── cli.ts                      # commander entry, default starts stdio
│           └── transports/
│               └── stdio.ts                # StdioServerTransport bootstrap
└── test/
    ├── setup.ts                            # global msw + env
    └── contract/
        └── tools-list.test.ts              # InMemoryTransport contract test
```

---

## Phase A — Repo bootstrap (Tasks 1-4)

### Task 1: Initialize pnpm workspace + root tsconfig

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.npmrc`
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "discord-mcp",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.11" },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
dist/
.turbo/
coverage/
*.log
.env
.env.local
.DS_Store
.vscode/
.idea/
```

- [ ] **Step 5: Create `.npmrc`**

```
auto-install-peers=true
strict-peer-dependencies=false
prefer-workspace-packages=true
```

- [ ] **Step 6: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 jhm1909

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 7: Create minimal `README.md`**

```markdown
# discord-mcp

TypeScript Model Context Protocol server exposing the Discord REST API to AI agents.

**Status:** Pre-alpha (v0.0). Not yet published.

See [design spec](docs/superpowers/specs/2026-04-28-discord-mcp-design.md) for architecture.
```

- [ ] **Step 8: Run install to materialize lockfile**

Run: `pnpm install`
Expected: `Done in N seconds` and `pnpm-lock.yaml` created. `node_modules/` populated with biome, turbo, typescript.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .gitignore .npmrc LICENSE README.md
git commit -m "chore: initialize pnpm workspace + tsconfig + license"
```

---

### Task 2: Configure biome (lint + format)

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.13/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!**/dist", "!**/coverage", "!**/.turbo", "!**/node_modules"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noConsole": { "level": "error", "options": { "allow": ["error", "warn"] } }
      },
      "style": { "noNonNullAssertion": "off" },
      "complexity": { "noUselessTypeConstraint": "error" }
    }
  }
}
```

- [ ] **Step 2: Verify biome runs clean on empty repo**

Run: `pnpm lint`
Expected: exit code 0. (Some informational diagnostics about config schema may appear — those are non-fatal.)

- [ ] **Step 3: Commit**

```bash
git add biome.json
git commit -m "chore: configure biome 2.x for lint + format"
```

---

### Task 3: Configure turbo

**Files:**
- Create: `turbo.json`

- [ ] **Step 1: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json", "tsdown.config.ts"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/**", "vitest.config.ts"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- [ ] **Step 2: Verify turbo recognizes empty workspace**

Run: `pnpm turbo run build --dry-run`
Expected: `No tasks were executed as part of this run.` (zero packages with build script — fine for now).

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "chore: configure turbo build pipeline"
```

---

### Task 4: Create `mcp-core` package skeleton

**Files:**
- Create: `packages/mcp-core/package.json`
- Create: `packages/mcp-core/tsconfig.json`
- Create: `packages/mcp-core/tsdown.config.ts`
- Create: `packages/mcp-core/src/index.ts`

- [ ] **Step 1: Create `packages/mcp-core/package.json`**

```json
{
  "name": "@discord-mcp/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "engines": { "node": ">=20.11" },
  "dependencies": {
    "@discordjs/rest": "^2.4.0",
    "@modelcontextprotocol/sdk": "^1.20.0",
    "@sapphire/pieces": "^4.4.1",
    "discord-api-types": "^0.38.0",
    "pino": "^9.5.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "msw": "^2.7.0",
    "tsdown": "^0.7.0",
    "typescript": "^5.6.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create `packages/mcp-core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/mcp-core/tsdown.config.ts`**

```typescript
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  target: 'node20',
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['@modelcontextprotocol/sdk', '@discordjs/rest', '@sapphire/pieces', 'pino', 'zod', 'discord-api-types'],
});
```

- [ ] **Step 4: Create stub `packages/mcp-core/src/index.ts`**

```typescript
// Public exports — populated as features land.
export const VERSION = '0.0.0';
```

- [ ] **Step 5: Install workspace deps**

Run: `pnpm install`
Expected: `Done`. New `node_modules` symlinks under `packages/mcp-core`.

- [ ] **Step 6: Verify build works**

Run: `pnpm --filter @discord-mcp/core build`
Expected: `dist/index.js` and `dist/index.d.ts` created. Console shows tsdown timing.

- [ ] **Step 7: Verify typecheck works**

Run: `pnpm --filter @discord-mcp/core typecheck`
Expected: exit 0, no output (or "No errors found").

- [ ] **Step 8: Commit**

```bash
git add packages/mcp-core/ pnpm-lock.yaml
git commit -m "feat(core): scaffold @discord-mcp/core package with tsdown build"
```

---

## Phase B — Container, Tool, Store (Tasks 5-7)

### Task 5: Define Container with declaration-merged singleton

**Files:**
- Create: `packages/mcp-core/src/container.ts`
- Create: `packages/mcp-core/src/logger.ts`
- Create: `packages/mcp-core/src/config.ts`
- Test: `packages/mcp-core/src/container.test.ts`

- [ ] **Step 1: Write failing test `container.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { container } from '@sapphire/pieces';
import './container.js'; // augments Container interface

describe('Container declaration-merge', () => {
  it('rest, logger, config slots compile-time present', () => {
    container.rest = {} as never;
    container.logger = {} as never;
    container.config = {} as never;
    expect(container.rest).toBeDefined();
    expect(container.logger).toBeDefined();
    expect(container.config).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test`
Expected: FAIL — `Property 'rest' does not exist on type 'Container'` (TS error caught by vitest typecheck) OR runtime error if module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/config.ts`**

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(50, 'DISCORD_TOKEN appears too short to be a valid bot token'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
```

- [ ] **Step 4: Create `packages/mcp-core/src/logger.ts`**

```typescript
import pino, { type Logger } from 'pino';
import type { Config } from './config.js';

export function createLogger(config: Config): Logger {
  return pino(
    { level: config.LOG_LEVEL },
    pino.destination(2), // stderr — stdio reserves stdout for JSON-RPC
  );
}
```

- [ ] **Step 5: Create `packages/mcp-core/src/container.ts`**

```typescript
import type { REST } from '@discordjs/rest';
import type { Logger } from 'pino';
import type { Config } from './config.js';

declare module '@sapphire/pieces' {
  interface Container {
    rest: REST;
    logger: Logger;
    config: Config;
  }
}

export {}; // ensure this file is treated as a module
```

- [ ] **Step 6: Create `packages/mcp-core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test`
Expected: PASS — 1 test passing.

- [ ] **Step 8: Commit**

```bash
git add packages/mcp-core/src/{container,logger,config,container.test}.ts packages/mcp-core/vitest.config.ts
git commit -m "feat(core): add Container declaration-merged + config + logger"
```

---

### Task 6: Define `Tool` base class (Sapphire Piece)

**Files:**
- Create: `packages/mcp-core/src/pieces/Tool.ts`
- Test: `packages/mcp-core/src/pieces/Tool.test.ts`

- [ ] **Step 1: Write failing test `Tool.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Tool } from './Tool.js';

class TestTool extends Tool {
  override readonly inputSchema = { foo: z.string() };
  override readonly description = 'Test tool';
  override readonly annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  override async run(args: { foo: string }) {
    return { echoed: args.foo };
  }
}

describe('Tool base class', () => {
  it('subclass exposes name, description, schema, annotations, run', () => {
    const t = new TestTool({ name: 'test_echo', path: 'memory', store: null as never }, { name: 'test_echo', enabled: true });
    expect(t.name).toBe('test_echo');
    expect(t.description).toBe('Test tool');
    expect(t.inputSchema.foo).toBeDefined();
    expect(t.annotations.readOnlyHint).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/pieces/Tool.test.ts`
Expected: FAIL — module `./Tool.js` not found.

- [ ] **Step 3: Create `packages/mcp-core/src/pieces/Tool.ts`**

```typescript
import { Piece } from '@sapphire/pieces';
import type { z } from 'zod';

export interface ToolAnnotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint: boolean;
  readonly idempotentHint: boolean;
  readonly openWorldHint: boolean;
}

export abstract class Tool extends Piece<Tool.Options, 'tools'> {
  /** Markdown description following NLT template (purpose / when_to_use / when_not / example / returns). */
  public abstract readonly description: string;

  /** Bare zod shape — keys become input parameter names. Use .describe() on every field. */
  public abstract readonly inputSchema: Record<string, z.ZodTypeAny>;

  /** Optional zod shape for structuredContent validation. */
  public readonly outputSchema?: Record<string, z.ZodTypeAny>;

  /** MCP tool annotations rendered in tools/list. */
  public abstract readonly annotations: ToolAnnotations;

  /** True if the tool is GET-shaped and safe to single-flight-coalesce. */
  public readonly idempotent: boolean = false;

  /** Implement the tool body. */
  public abstract run(args: unknown, ctx: ToolRunContext): Promise<unknown>;
}

export interface ToolRunContext {
  readonly signal: AbortSignal;
}

export namespace Tool {
  export type Options = Piece.Options;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/pieces/Tool.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/pieces/Tool.ts packages/mcp-core/src/pieces/Tool.test.ts
git commit -m "feat(core): add Tool base class extending Sapphire Piece"
```

---

### Task 7: Define `ToolStore` (Sapphire Store)

**Files:**
- Create: `packages/mcp-core/src/stores/ToolStore.ts`
- Test: `packages/mcp-core/src/stores/ToolStore.test.ts`

- [ ] **Step 1: Write failing test `ToolStore.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { ToolStore } from './ToolStore.js';

describe('ToolStore', () => {
  it('exposes store name "tools"', () => {
    const store = new ToolStore();
    expect(store.name).toBe('tools');
  });
  it('starts empty', () => {
    const store = new ToolStore();
    expect(store.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/stores/ToolStore.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/stores/ToolStore.ts`**

```typescript
import { Store } from '@sapphire/pieces';
import { Tool } from '../pieces/Tool.js';

export class ToolStore extends Store<Tool, 'tools'> {
  public constructor() {
    super(Tool, { name: 'tools' });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/stores/ToolStore.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/stores/ToolStore.ts packages/mcp-core/src/stores/ToolStore.test.ts
git commit -m "feat(core): add ToolStore for Sapphire-style auto-discovery"
```

---

## Phase C — defineTool factory + helpers (Tasks 8-10)

### Task 8: Branded snowflake type + zod schema

**Files:**
- Create: `packages/mcp-core/src/tools/_lib/snowflake.ts`
- Test: `packages/mcp-core/src/tools/_lib/snowflake.test.ts`

- [ ] **Step 1: Write failing test `snowflake.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { Snowflake, ChannelId, GuildId, MessageId, UserId, RoleId } from './snowflake.js';

describe('Snowflake schemas', () => {
  it('accepts a 17-digit snowflake', () => {
    expect(Snowflake.safeParse('11223344556677889').success).toBe(true);
  });
  it('accepts a 20-digit snowflake', () => {
    expect(Snowflake.safeParse('11223344556677889900').success).toBe(true);
  });
  it('rejects a 16-digit string', () => {
    expect(Snowflake.safeParse('1122334455667788').success).toBe(false);
  });
  it('rejects a 21-digit string', () => {
    expect(Snowflake.safeParse('112233445566778899001').success).toBe(false);
  });
  it('rejects non-numeric content', () => {
    expect(Snowflake.safeParse('abc456789012345678').success).toBe(false);
  });
  it('exports branded ID variants with same shape', () => {
    for (const s of [ChannelId, GuildId, MessageId, UserId, RoleId]) {
      expect(s.safeParse('123456789012345678').success).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/snowflake.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/tools/_lib/snowflake.ts`**

```typescript
import { z } from 'zod';

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export const Snowflake = z
  .string()
  .regex(SNOWFLAKE_REGEX, 'Must be a 17-20 digit Discord snowflake');

export const ChannelId = Snowflake.brand<'ChannelId'>().describe('Discord channel ID (snowflake)');
export const GuildId = Snowflake.brand<'GuildId'>().describe('Discord guild (server) ID');
export const MessageId = Snowflake.brand<'MessageId'>().describe('Discord message ID');
export const UserId = Snowflake.brand<'UserId'>().describe('Discord user ID');
export const RoleId = Snowflake.brand<'RoleId'>().describe('Discord role ID');
export const ApplicationId = Snowflake.brand<'ApplicationId'>().describe('Discord application ID');
export const WebhookId = Snowflake.brand<'WebhookId'>().describe('Discord webhook ID');
export const EmojiId = Snowflake.brand<'EmojiId'>().describe('Discord custom emoji ID');

// Inferred branded types for compile-time safety:
export type ChannelId = z.infer<typeof ChannelId>;
export type GuildId = z.infer<typeof GuildId>;
export type MessageId = z.infer<typeof MessageId>;
export type UserId = z.infer<typeof UserId>;
export type RoleId = z.infer<typeof RoleId>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/snowflake.test.ts`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/tools/_lib/snowflake.ts packages/mcp-core/src/tools/_lib/snowflake.test.ts
git commit -m "feat(core): add branded Snowflake zod schemas (ChannelId, GuildId, ...)"
```

---

### Task 9: Dual-result response helper

**Files:**
- Create: `packages/mcp-core/src/tools/_lib/response.ts`
- Test: `packages/mcp-core/src/tools/_lib/response.test.ts`

- [ ] **Step 1: Write failing test `response.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { dualResult } from './response.js';

describe('dualResult', () => {
  it('returns content[0] text + structuredContent + isError false', () => {
    const r = dualResult({ text: 'hello world', data: { foo: 1 } });
    expect(r.isError).toBe(false);
    expect(r.content).toEqual([{ type: 'text', text: 'hello world' }]);
    expect(r.structuredContent).toEqual({ foo: 1 });
  });
  it('appends truncation note + cursor suggestion when truncated', () => {
    const r = dualResult({
      text: '5 channels',
      data: { items: [], has_more: true },
      truncated: { reason: 'Showing 5 of 47 results', cursor: 'eyJ...', full_count: 47 },
    });
    const txt = (r.content[0] as { type: string; text: string }).text;
    expect(txt).toContain('5 channels');
    expect(txt).toContain('Showing 5 of 47 results');
    expect(txt).toContain('cursor:"eyJ..."');
    expect(txt).toContain('47 total available');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/response.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/tools/_lib/response.ts`**

```typescript
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface DualResultOpts<T> {
  text: string;
  data: T;
  truncated?: {
    reason: string;
    cursor?: string;
    full_count?: number;
  };
}

export function dualResult<T>(opts: DualResultOpts<T>): CallToolResult {
  let text = opts.text;
  if (opts.truncated) {
    text += `\n\n_${opts.truncated.reason}_`;
    if (opts.truncated.cursor) {
      text += ` Resume with \`cursor:"${opts.truncated.cursor}"\`.`;
    }
    if (opts.truncated.full_count !== undefined) {
      text += ` (${opts.truncated.full_count} total available)`;
    }
  }
  return {
    isError: false,
    content: [{ type: 'text', text }],
    structuredContent: opts.data as Record<string, unknown>,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/response.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/tools/_lib/response.ts packages/mcp-core/src/tools/_lib/response.test.ts
git commit -m "feat(core): add dualResult helper for text + structuredContent"
```

---

### Task 10: `defineTool()` factory function

**Files:**
- Create: `packages/mcp-core/src/tools/_lib/defineTool.ts`
- Test: `packages/mcp-core/src/tools/_lib/defineTool.test.ts`

- [ ] **Step 1: Write failing test `defineTool.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineTool } from './defineTool.js';

describe('defineTool', () => {
  it('produces a Tool subclass with correct name + schema', async () => {
    const EchoCls = defineTool({
      name: 'test_echo',
      description: 'Echo back input',
      inputSchema: { msg: z.string().describe('Message to echo') },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      handler: async ({ msg }) => ({ echoed: msg }),
    });

    const instance = new EchoCls(
      { name: 'test_echo', path: 'memory', store: null as never },
      { name: 'test_echo', enabled: true },
    );

    expect(instance.name).toBe('test_echo');
    expect(instance.description).toBe('Echo back input');
    expect(instance.inputSchema.msg).toBeDefined();
    expect(instance.annotations.readOnlyHint).toBe(true);

    const result = await instance.run({ msg: 'hello' }, { signal: new AbortController().signal });
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('rejects names that violate snake_case verb-first rule', () => {
    expect(() =>
      defineTool({
        name: 'BadName',
        description: '',
        inputSchema: {},
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        handler: async () => ({}),
      }),
    ).toThrow(/snake_case/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/defineTool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/tools/_lib/defineTool.ts`**

```typescript
import type { z } from 'zod';
import { Tool, type ToolAnnotations, type ToolRunContext } from '../../pieces/Tool.js';

const TOOL_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

export interface ToolDefinition<I extends Record<string, z.ZodTypeAny>, O> {
  name: string;
  description: string;
  inputSchema: I;
  outputSchema?: Record<string, z.ZodTypeAny>;
  annotations: ToolAnnotations;
  idempotent?: boolean;
  handler: (args: { [K in keyof I]: z.infer<I[K]> }, ctx: ToolRunContext) => Promise<O>;
}

export function defineTool<I extends Record<string, z.ZodTypeAny>, O>(
  def: ToolDefinition<I, O>,
): typeof Tool {
  if (!TOOL_NAME_RE.test(def.name)) {
    throw new Error(
      `Tool name '${def.name}' invalid: must be snake_case starting with a lowercase letter, max 64 chars (regex: ${TOOL_NAME_RE.source}).`,
    );
  }

  class GeneratedTool extends Tool {
    public override readonly description = def.description;
    public override readonly inputSchema = def.inputSchema;
    public override readonly outputSchema = def.outputSchema;
    public override readonly annotations = def.annotations;
    public override readonly idempotent = def.idempotent ?? false;

    public override async run(args: unknown, ctx: ToolRunContext): Promise<unknown> {
      return def.handler(args as { [K in keyof I]: z.infer<I[K]> }, ctx);
    }
  }

  // Sapphire reads `name` from constructor.options at registration time —
  // we set the static name as a hint only.
  Object.defineProperty(GeneratedTool, 'name', { value: def.name });
  return GeneratedTool;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/tools/_lib/defineTool.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/tools/_lib/defineTool.ts packages/mcp-core/src/tools/_lib/defineTool.test.ts
git commit -m "feat(core): add defineTool() factory generating Tool subclasses"
```

---

## Phase D — First real tool: messages_send (Tasks 11-13)

### Task 11: Set up msw + global test setup

**Files:**
- Create: `test/setup.ts`
- Create: `test/mocks/discord-handlers.ts`
- Modify: `packages/mcp-core/vitest.config.ts:1-12`

- [ ] **Step 1: Create `test/mocks/discord-handlers.ts`**

```typescript
import { http, HttpResponse } from 'msw';

const DISCORD_API = 'https://discord.com/api/v10';

export const handlers = [
  // Default: messages_send happy path
  http.post(`${DISCORD_API}/channels/:channelId/messages`, async ({ params, request }) => {
    const body = (await request.json()) as { content?: string; tts?: boolean };
    return HttpResponse.json({
      id: '999000999000999000',
      channel_id: params.channelId,
      content: body.content ?? '',
      tts: body.tts ?? false,
      timestamp: '2026-04-28T12:00:00.000000+00:00',
      author: { id: '111', username: 'TestBot', global_name: 'TestBot', bot: true },
      type: 0,
    });
  }),
];
```

- [ ] **Step 2: Create `test/setup.ts`**

```typescript
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { handlers } from './mocks/discord-handlers.js';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 3: Update `packages/mcp-core/vitest.config.ts`**

Replace existing content with:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['../../test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
```

- [ ] **Step 4: Verify msw is registered (existing tests still pass)**

Run: `pnpm --filter @discord-mcp/core test`
Expected: All existing tests still pass; setup file loaded without errors.

- [ ] **Step 5: Commit**

```bash
git add test/setup.ts test/mocks/discord-handlers.ts packages/mcp-core/vitest.config.ts
git commit -m "test: configure msw 2.7 with default Discord REST handlers"
```

---

### Task 12: Implement `messages_send` tool

**Files:**
- Create: `packages/mcp-core/src/tools/messages/send.ts`
- Test: `packages/mcp-core/src/tools/messages/send.test.ts`

- [ ] **Step 1: Write failing test `send.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { container } from '@sapphire/pieces';
import { messagesSend } from './send.js';
import '../../container.js';

describe('messages_send tool', () => {
  it('returns dualResult with message_id, jump_url, timestamp on success', async () => {
    container.rest = new REST({ version: '10' }).setToken('Bot fake.test.token-abcdefghijklmnopqrstuvwxyz');

    const ToolCls = messagesSend;
    const instance = new ToolCls(
      { name: 'messages_send', path: 'memory', store: null as never },
      { name: 'messages_send', enabled: true },
    );

    const result = await instance.run(
      { channel_id: '112233445566778899', content: 'hello world' },
      { signal: new AbortController().signal },
    );

    expect(result).toMatchObject({
      isError: false,
      structuredContent: {
        message_id: '999000999000999000',
        channel_id: '112233445566778899',
        timestamp: '2026-04-28T12:00:00.000000+00:00',
      },
    });
    const data = (result as { structuredContent: { jump_url: string } }).structuredContent;
    expect(data.jump_url).toMatch(/^https:\/\/discord\.com\/channels\/@me\/112233445566778899\/999000999000999000$/);
  });

  it('rejects empty content', async () => {
    const ToolCls = messagesSend;
    const instance = new ToolCls(
      { name: 'messages_send', path: 'memory', store: null as never },
      { name: 'messages_send', enabled: true },
    );
    await expect(
      instance.run({ channel_id: '112233445566778899' }, { signal: new AbortController().signal }),
    ).rejects.toThrow(/content.*required/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/tools/messages/send.test.ts`
Expected: FAIL — module `./send.js` not found.

- [ ] **Step 3: Create `packages/mcp-core/src/tools/messages/send.ts`**

```typescript
import { z } from 'zod';
import { Routes } from 'discord-api-types/v10';
import { container } from '@sapphire/pieces';
import { defineTool } from '../_lib/defineTool.js';
import { ChannelId, MessageId } from '../_lib/snowflake.js';
import { dualResult } from '../_lib/response.js';

interface DiscordMessageResponse {
  id: string;
  channel_id: string;
  content: string;
  timestamp: string;
  guild_id?: string;
}

export const messagesSend = defineTool({
  name: 'messages_send',
  description: [
    '**Purpose**: Send a plain-text message to a Discord channel.',
    '',
    '**When to use**:',
    '- Reply to user request like "send X to #channel".',
    '- Programmatic announcements without rich layout.',
    '',
    '**When NOT to use**:',
    '- Rich layout (containers, sections, media galleries) → use `components_v2_send`.',
    '- High-volume delivery → use `webhooks_execute` (avoids bot rate limit).',
    '',
    '**Example**: `{channel_id:"112233445566778899", content:"hello"}`',
    '',
    '**Returns**: `{message_id, channel_id, jump_url, timestamp}`.',
  ].join('\n'),
  inputSchema: {
    channel_id: ChannelId.describe('Target channel ID'),
    content: z
      .string()
      .min(1, 'content required (max 2000 chars)')
      .max(2000, 'content max 2000 chars')
      .describe('Message text content (max 2000 chars).'),
    tts: z.boolean().optional().describe('Text-to-speech, default false'),
  },
  outputSchema: {
    message_id: MessageId,
    channel_id: ChannelId,
    jump_url: z.string().url(),
    timestamp: z.string(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (args) => {
    const msg = (await container.rest.post(Routes.channelMessages(args.channel_id), {
      body: { content: args.content, tts: args.tts ?? false },
    })) as DiscordMessageResponse;

    const jumpRoot = msg.guild_id ?? '@me';
    return dualResult({
      text: `Sent message ${msg.id} to <#${msg.channel_id}>.`,
      data: {
        message_id: msg.id,
        channel_id: msg.channel_id,
        jump_url: `https://discord.com/channels/${jumpRoot}/${msg.channel_id}/${msg.id}`,
        timestamp: msg.timestamp,
      },
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/tools/messages/send.test.ts`
Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-core/src/tools/messages/send.ts packages/mcp-core/src/tools/messages/send.test.ts
git commit -m "feat(core): implement messages_send tool with msw test coverage"
```

---

### Task 13: `buildServer()` factory wiring registry → MCP

**Files:**
- Create: `packages/mcp-core/src/server.ts`
- Test: `packages/mcp-core/src/server.test.ts`
- Modify: `packages/mcp-core/src/index.ts:1-2`

- [ ] **Step 1: Write failing test `server.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { REST } from '@discordjs/rest';
import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

describe('buildServer', () => {
  it('registers tools and exposes them via list_tools', async () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'Bot fake.test.token-abcdefghijklmnopqrstuvwxyz1234567890',
      LOG_LEVEL: 'fatal',
    } as NodeJS.ProcessEnv);
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    const logger = createLogger(config);

    const { server, registeredTools } = await buildServer({ rest, logger, config });
    expect(server).toBeDefined();
    expect(registeredTools).toContain('messages_send');
    expect(registeredTools.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @discord-mcp/core test src/server.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `packages/mcp-core/src/server.ts`**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool as McpTool,
} from '@modelcontextprotocol/sdk/types.js';
import { container } from '@sapphire/pieces';
import { z } from 'zod';
import type { REST } from '@discordjs/rest';
import type { Logger } from 'pino';
import type { Config } from './config.js';
import { ToolStore } from './stores/ToolStore.js';
import { messagesSend } from './tools/messages/send.js';

export interface BuildServerDeps {
  rest: REST;
  logger: Logger;
  config: Config;
}

export interface BuildServerResult {
  server: Server;
  registeredTools: string[];
}

export async function buildServer(deps: BuildServerDeps): Promise<BuildServerResult> {
  // Wire container slots (declaration-merged singleton).
  container.rest = deps.rest;
  container.logger = deps.logger;
  container.config = deps.config;

  // Initialize stores.
  const toolStore = new ToolStore();
  // v0: register the one hot-path tool inline. Plan 1+ replaces this with auto-discovery.
  toolStore.set(
    'messages_send',
    new (messagesSend)(
      { name: 'messages_send', path: 'inline', store: toolStore as never },
      { name: 'messages_send', enabled: true },
    ),
  );

  const registeredTools: string[] = [...toolStore.keys()];

  // Build MCP server.
  const server = new Server(
    { name: 'discord-mcp', version: '0.0.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Discord MCP server. v0 skeleton — only messages_send available. ' +
        'Use guild ID, channel ID, message ID where required (17-20 digit Discord snowflakes).',
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: McpTool[] = [];
    for (const tool of toolStore.values()) {
      const inputSchema = z.object(tool.inputSchema);
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: z.toJSONSchema(inputSchema, { target: 'draft-2020-12' }) as McpTool['inputSchema'],
        annotations: tool.annotations,
      });
    }
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req, extra) => {
    const tool = toolStore.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool '${req.params.name}' not found.` }],
      };
    }
    const inputSchema = z.object(tool.inputSchema);
    const parsed = inputSchema.safeParse(req.params.arguments ?? {});
    if (!parsed.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text:
              `**Input Error**\n\n` +
              parsed.error.issues.map((i) => `- \`${i.path.join('.')}\`: ${i.message}`).join('\n'),
          },
        ],
        structuredContent: { code: 'VALIDATION_FAILED', issues: parsed.error.issues },
      };
    }
    try {
      const result = await tool.run(parsed.data, { signal: extra.signal });
      // result is already a CallToolResult shape from dualResult().
      return result as never;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      deps.logger.error({ err: e, tool: tool.name }, 'tool execution failed');
      return {
        isError: true,
        content: [{ type: 'text', text: `**Internal Error in \`${tool.name}\`**\n\n${msg}` }],
        structuredContent: { code: 'INTERNAL_ERROR', message: msg },
      };
    }
  });

  return { server, registeredTools };
}
```

- [ ] **Step 4: Update `packages/mcp-core/src/index.ts`**

```typescript
export { buildServer, type BuildServerDeps, type BuildServerResult } from './server.js';
export { loadConfig, type Config } from './config.js';
export { createLogger } from './logger.js';
export { Tool, type ToolAnnotations, type ToolRunContext } from './pieces/Tool.js';
export { ToolStore } from './stores/ToolStore.js';
export { defineTool, type ToolDefinition } from './tools/_lib/defineTool.js';
export { dualResult, type DualResultOpts } from './tools/_lib/response.js';
export { Snowflake, ChannelId, GuildId, MessageId, UserId, RoleId } from './tools/_lib/snowflake.js';
export const VERSION = '0.0.0';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @discord-mcp/core test src/server.test.ts`
Expected: PASS — 1 test passing.

- [ ] **Step 6: Run full test suite**

Run: `pnpm --filter @discord-mcp/core test`
Expected: All tests pass (12 tests across 6 files).

- [ ] **Step 7: Commit**

```bash
git add packages/mcp-core/src/server.ts packages/mcp-core/src/server.test.ts packages/mcp-core/src/index.ts
git commit -m "feat(core): add buildServer() wiring tool registry to MCP Server"
```

---

## Phase E — `mcp-server` package + stdio (Tasks 14-16)

### Task 14: Scaffold `@discord-mcp/cli` package

**Files:**
- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/tsdown.config.ts`
- Create: `packages/mcp-server/src/cli.ts` (stub)

- [ ] **Step 1: Create `packages/mcp-server/package.json`**

```json
{
  "name": "@discord-mcp/cli",
  "version": "0.0.0",
  "private": false,
  "type": "module",
  "mcpName": "io.github.jhm1909/discord-mcp",
  "description": "Discord MCP server — stdio transport CLI",
  "bin": { "discord-mcp": "./dist/cli.js" },
  "main": "./dist/cli.js",
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=20.11" },
  "os": ["darwin", "linux", "win32"],
  "keywords": ["mcp", "model-context-protocol", "discord", "ai", "claude", "cursor"],
  "publishConfig": { "access": "public", "provenance": true },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@discord-mcp/core": "workspace:*",
    "@discordjs/rest": "^2.4.0",
    "@modelcontextprotocol/sdk": "^1.20.0",
    "commander": "^12.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsdown": "^0.7.0",
    "typescript": "^5.6.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Create `packages/mcp-server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Create `packages/mcp-server/tsdown.config.ts`**

```typescript
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  target: 'node20',
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['@discord-mcp/core', '@modelcontextprotocol/sdk', '@discordjs/rest'],
  // Add a Node shebang to the CLI bin so npx can execute it.
  shims: false,
});
```

- [ ] **Step 4: Create stub `packages/mcp-server/src/cli.ts`**

```typescript
#!/usr/bin/env node
console.error('discord-mcp CLI placeholder — Task 16 will wire stdio transport');
```

- [ ] **Step 5: Install workspace deps**

Run: `pnpm install`
Expected: `Done`. workspace symlink `@discord-mcp/core → ../mcp-core` resolved.

- [ ] **Step 6: Verify build produces `dist/cli.js` with shebang**

Run: `pnpm --filter @discord-mcp/cli build`
Then: `head -n 1 packages/mcp-server/dist/cli.js`
Expected: First line `#!/usr/bin/env node`. (tsdown preserves source shebang.)

- [ ] **Step 7: Commit**

```bash
git add packages/mcp-server/ pnpm-lock.yaml
git commit -m "feat(server): scaffold @discord-mcp/cli package with bin entry"
```

---

### Task 15: Stdio transport bootstrap

**Files:**
- Create: `packages/mcp-server/src/transports/stdio.ts`

- [ ] **Step 1: Create `packages/mcp-server/src/transports/stdio.ts`**

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { REST } from '@discordjs/rest';
import { buildServer, loadConfig, createLogger } from '@discord-mcp/core';

export async function startStdio(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const rest = new REST({ version: '10' }).setToken(
    // Discord REST does not want the "Bot " prefix here — discord.js's REST adds it.
    config.DISCORD_TOKEN.startsWith('Bot ') ? config.DISCORD_TOKEN.slice(4) : config.DISCORD_TOKEN,
  );

  const { server, registeredTools } = await buildServer({ rest, logger, config });
  logger.info({ tools: registeredTools.length }, 'discord-mcp ready (stdio)');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @discord-mcp/cli typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/mcp-server/src/transports/stdio.ts
git commit -m "feat(server): add stdio transport bootstrap"
```

---

### Task 16: Wire CLI to stdio transport

**Files:**
- Modify: `packages/mcp-server/src/cli.ts:1-3`

- [ ] **Step 1: Replace `packages/mcp-server/src/cli.ts` content**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { startStdio } from './transports/stdio.js';

const program = new Command('discord-mcp')
  .description('Discord MCP server — stdio transport for AI agents')
  .version('0.0.0');

program
  .action(async () => {
    try {
      await startStdio();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`discord-mcp failed to start: ${msg}`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
```

- [ ] **Step 2: Build the CLI**

Run: `pnpm --filter @discord-mcp/cli build`
Expected: `dist/cli.js` regenerated, ~50KB+.

- [ ] **Step 3: Smoke test — invoke without token expects clear error**

Run: `node packages/mcp-server/dist/cli.js`
Expected: Exit 1, stderr contains `Invalid configuration:` and mentions `DISCORD_TOKEN`.

- [ ] **Step 4: Smoke test — invoke with fake token (no real Discord call)**

Run: `DISCORD_TOKEN=Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa node packages/mcp-server/dist/cli.js < /dev/null`
Expected: After ~1s of waiting for stdin EOF, process exits cleanly. Stderr shows `discord-mcp ready (stdio)`.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp-server/src/cli.ts
git commit -m "feat(server): wire CLI default action → stdio transport"
```

---

## Phase F — Protocol contract test (Tasks 17-18)

### Task 17: InMemoryTransport contract test

**Files:**
- Create: `packages/mcp-core/src/server.contract.test.ts`

- [ ] **Step 1: Create `packages/mcp-core/src/server.contract.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { REST } from '@discordjs/rest';
import { buildServer } from './server.js';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';

describe('MCP protocol contract', () => {
  const fakeEnv = {
    DISCORD_TOKEN: 'Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    LOG_LEVEL: 'fatal',
  } as NodeJS.ProcessEnv;
  const config = loadConfig(fakeEnv);
  const rest = new REST({ version: '10' }).setToken('fake-token');
  const logger = createLogger(config);

  let client: Client;

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const { server } = await buildServer({ rest, logger, config });
    client = new Client({ name: 'contract-test', version: '0.0.0' }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('listTools returns at least 1 tool with valid JSON Schema', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);
    for (const t of tools) {
      expect(t.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(t.description).toBeTypeOf('string');
      expect(t.inputSchema).toMatchObject({ type: 'object' });
    }
  });

  it('messages_send is registered', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('messages_send');
  });

  it('callTool with invalid args returns isError=true (not throws)', async () => {
    const r = await client.callTool({ name: 'messages_send', arguments: {} });
    expect(r.isError).toBe(true);
    const text = (r.content as Array<{ type: string; text: string }>)[0];
    expect(text.type).toBe('text');
    expect(text.text).toMatch(/input error/i);
  });

  it('callTool with valid args returns dualResult shape', async () => {
    const r = await client.callTool({
      name: 'messages_send',
      arguments: { channel_id: '112233445566778899', content: 'hi' },
    });
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      message_id: '999000999000999000',
      jump_url: expect.stringContaining('discord.com/channels/'),
    });
  });
});
```

- [ ] **Step 2: Run contract test**

Run: `pnpm --filter @discord-mcp/core test src/server.contract.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 3: Run full suite**

Run: `pnpm test`
Expected: All packages tested, all green.

- [ ] **Step 4: Commit**

```bash
git add packages/mcp-core/src/server.contract.test.ts
git commit -m "test(core): add MCP protocol contract test via InMemoryTransport"
```

---

### Task 18: Add MCP Inspector smoke command to docs

**Files:**
- Modify: `README.md:1-7`

- [ ] **Step 1: Replace `README.md` content**

```markdown
# discord-mcp

TypeScript Model Context Protocol server exposing the Discord REST API to AI agents.

**Status:** Pre-alpha (v0.0). Not yet published.

See [design spec](docs/superpowers/specs/2026-04-28-discord-mcp-design.md) for architecture.

## Local development

Prerequisites: Node ≥20.11, pnpm ≥9.15.

```bash
pnpm install
pnpm build
pnpm test
```

## Smoke test (real Discord)

Set `DISCORD_TOKEN` to a real bot token from <https://discord.com/developers/applications>:

```bash
export DISCORD_TOKEN="Bot YOUR_TOKEN_HERE"
node packages/mcp-server/dist/cli.js
```

Then use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) in another terminal:

```bash
npx -y @modelcontextprotocol/inspector node packages/mcp-server/dist/cli.js
```

Open the Inspector UI at <http://localhost:5173>, click `tools/list`, and you should see `messages_send`. Try calling it with `{channel_id: "<your channel>", content: "test"}`.

## Status

This repository implements **Plan 0 — Project skeleton** from `docs/superpowers/plans/`. Subsequent plans add the remaining 174 tools, middleware chain, Components V2, pipeline executor, and distribution polish.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add local dev + smoke test instructions"
```

---

## Phase G — CI scaffold (Tasks 19-20)

### Task 19: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  test:
    runs-on: ubuntu-24.04
    strategy:
      fail-fast: false
      matrix:
        node: ['22.12', '24.x']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
  audit:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15
      - uses: actions/setup-node@v4
        with:
          node-version: '24.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high --prod
```

- [ ] **Step 2: Verify YAML is valid by reading**

Run: `cat .github/workflows/ci.yml | head -40`
Expected: clean YAML, no parse errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions matrix (Node 22.12, 24.x) lint+typecheck+build+test+audit"
```

---

### Task 20: End-to-end final validation

**Files:**
- (no new files)

- [ ] **Step 1: Verify clean install from scratch works**

Run:
```bash
rm -rf node_modules packages/*/node_modules packages/*/dist
pnpm install
```
Expected: clean install succeeds.

- [ ] **Step 2: Run full pipeline locally**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm test`
Expected: all four steps pass.

- [ ] **Step 3: Smoke test the built CLI without token (should fail with clear error)**

Run: `node packages/mcp-server/dist/cli.js`
Expected: exit 1; stderr contains `Invalid configuration:` and `DISCORD_TOKEN`.

- [ ] **Step 4: Smoke test the built CLI with fake token + EOF stdin (should boot then exit cleanly)**

Run: `DISCORD_TOKEN="Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" node packages/mcp-server/dist/cli.js < /dev/null`
Expected: stderr line `discord-mcp ready (stdio)` then process exits cleanly.

- [ ] **Step 5: Tag the v0.0.0 milestone commit**

Run:
```bash
git tag -a v0.0.0 -m "Plan 0 complete: project skeleton with messages_send"
git log --oneline | head -25
```
Expected: ~21 commits visible since `chore: initialize pnpm workspace`, tag `v0.0.0` on the latest.

- [ ] **Step 6: Create completion marker commit**

Run:
```bash
git commit --allow-empty -m "milestone: Plan 0 complete — skeleton + messages_send working

- Monorepo with @discord-mcp/core + @discord-mcp/cli
- @sapphire/pieces Container + ToolStore registered
- defineTool() factory with branded snowflake support
- messages_send tool tested via msw + protocol contract via InMemoryTransport
- Stdio transport bootstrap with pino → stderr
- Biome lint + tsdown build + vitest test + GitHub Actions CI

Next: Plan 1 — error class hierarchy + onion middleware chain."
```

---

## Self-Review Checklist

After completing all tasks above, verify:

- [ ] **Spec coverage:** Plan 0 covers spec §3.5 progressive-disclosure foundation (1 tool registered, ToolStore ready), §4.1 file-tree slice (mcp-core + mcp-server packages exist), §4.2 decisions #1 (pnpm monorepo), #2 (sapphire pieces), #3 (defineTool factory), §6.3 output format (dualResult), §10.1 stack pinning (tsdown, vitest@3.2, biome, pnpm). Decisions #4-15 (error hierarchy, middleware chain, breaker, OTel, ALS, pipeline, plugin lifecycle, capability router, untrusted wrap) are deferred to Plans 1+ as documented in the plan header.

- [ ] **Placeholder scan:** No "TBD", "TODO", "implement later" in any task. Code blocks are complete and runnable.

- [ ] **Type consistency:** `Tool` base class properties (`name`, `description`, `inputSchema`, `outputSchema`, `annotations`, `idempotent`, `run`) match between `Tool.ts`, `defineTool.ts`, and `server.ts`. `BuildServerDeps` interface matches what `stdio.ts` constructs. `ChannelId`, `MessageId` etc. names are consistent throughout.

- [ ] **Frequent commits:** 21 commits across 20 tasks (1 task has 2 commits). Each commit is self-contained and reverts cleanly.

- [ ] **TDD discipline:** Tasks 5, 6, 7, 8, 9, 10, 12, 13, 17 follow write-test-fail-implement-pass-commit cycle.

---

## What this plan does NOT do (by design)

- No middleware chain — every tool calls Discord directly. **Plan 1** adds the onion (redact/telemetry/audit/validate/precondition/coalesce/idempotency/resilience).
- No error class hierarchy — `server.ts:setRequestHandler` does inline catch + generic message. **Plan 1** adds typed errors + `formatErrorForUser`.
- No untrusted XML wrapping — `messages_send` doesn't read content, so not yet needed. **Plan 1** lands the wrapper for use by `messages_read` etc.
- No auto-discovery of tools from `src/tools/**` — `server.ts` currently registers `messages_send` inline. **Plan 1** wires `ToolStore.loadAll()` with filesystem discovery.
- No annotation auto-classification — `messages_send` has annotations hand-written. **Plan 1** adds the auto-classifier from spec §4.2.
- No CLI sub-commands (`doctor`, `init`, etc.) — only the default action. **Plan 9** adds the full DX surface.
- No OTel / pino-roll / Sentry — `pino` is configured for stderr only. **Plan 8** lands the observability stack.

---

## Execution Notes

- **Estimated time:** experienced developer ~3-5 hours; subagent-driven ~6-10 minutes per task.
- **Critical dependency check:** before starting, verify `@sapphire/pieces` latest stable supports the `declare module` pattern shown. As of April 2026 the package is at v4.5.x; if v5 has breaking changes, pin v4 in package.json.
- **Discord API token:** task 20 requires a real Discord bot token only for the final smoke test. Earlier tasks use msw mocks throughout.
- **No Gateway in this plan:** `discord.js` Client is intentionally NOT installed. `@discordjs/rest` alone is enough for v0. Plan 6 adds optional Gateway support.
