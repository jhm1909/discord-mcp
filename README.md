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
