# discord-mcp

Production-grade Model Context Protocol server exposing the full Discord REST API to AI agents.

**Status**: v0.9.0 · 192 tools · OTel-instrumented · Cockatiel-resilient · Audit-logged

See [design spec](docs/superpowers/specs/2026-04-28-discord-mcp-design.md) for architecture.

## Quick start

```bash
# 1. Install
npm install -g @discord-mcp/cli  # or use npx

# 2. Bootstrap config for your MCP client
discord-mcp init --client claude-desktop --token "Bot YOUR.BOT.TOKEN"

# 3. Verify configuration
discord-mcp doctor --online

# 4. Run (or let your MCP client launch it)
discord-mcp serve
```

## Subcommands

### `discord-mcp serve` (default)

Start the stdio MCP server. This is the default action when no subcommand is given.

**Flags**:
- `--gateway` — Enable Discord Gateway resource subscriptions (lazy-imports discord.js)

### `discord-mcp doctor`

Diagnose configuration and connectivity. Exits 0 (healthy), 1 (warnings), or 2 (errors).

**Flags**:
- `--online` — Run network checks (Discord token verify, OTel reachability)
- `--json` — Output as JSON for CI consumption

**Offline checks**: node-version, token-format, env-vars, audit-sink, client-caps
**Online checks** (with `--online`): token-online, otel-reachable

### `discord-mcp init`

Bootstrap configuration + generate MCP client config snippet.

**Flags**:
- `--token <token>` — Discord bot token (or `${env:DISCORD_TOKEN}` placeholder)
- `--client <id>` — Client: `claude-desktop`, `claude-code`, `cursor`, or `generic`
- `--output <path>` — Write snippet to file (default: stdout)
- `--force` — Overwrite existing output file
- `--gateway` — Enable Discord Gateway in generated config
- `--json` — JSON output for CI

When stdin is a TTY and flags are missing, init runs an interactive wizard.

### `discord-mcp migrate`

Migrate from another Discord/MCP setup. Exits 0 (all mapped), 1 (some unmapped), 2 (errors).

**Flags**:
- `--from <adapter>` — Source adapter id (run without `--from` to list)
- `--source <path>` — Path to source repo (default: cwd)
- `--json` — JSON output

**Available adapters**: `hubdustry-go-mcp` (reference impl). More in Plan 11.

## Tool surface

192 tools across:
- messages (12)
- channels (14)
- threads (6)
- members (14)
- roles (5)
- guild (16)
- audit_log (1)
- webhooks (13)
- events (6)
- commands (15)
- users (6)
- components-v2 (8)
- intelligence (5)
- meta (1)
- reactions (5)
- emojis (5)
- app_emojis (5)
- stickers (7)
- invites (4)
- automod (5)
- interactions (8)
- application (5)
- stage_instances (4)
- soundboard (7)
- polls (2)
- voice (3)
- onboarding (2)
- monetization (8)

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

Open the Inspector UI at <http://localhost:5173>, click `tools/list`, and you should see all 192 tools.

## Documentation

- [Operations: telemetry](docs/operations/telemetry.md) — OTel setup
- [Operations: resilience](docs/operations/resilience.md) — Tuning retry/timeout/circuit
- [Operations: audit](docs/operations/audit.md) — Audit sinks + compliance

## License

MIT — see [LICENSE](LICENSE).
