import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BrokenCircuitError, BulkheadRejectedError } from 'cockatiel';
import {
  BulkheadFullError,
  CancelledError,
  CircuitOpenError,
  DiscordAuthError,
  DiscordCloudflareBlocked,
  DiscordError,
  DiscordNotFoundError,
  DiscordPermissionError,
  DiscordRateLimitError,
  DiscordServerError,
  DryRunPreview,
  GuildNotAllowedError,
  ScopeRejectedError,
  ValidationError,
} from './index.js';

export interface FormatErrorContext {
  readonly toolName: string;
  readonly transport: 'stdio' | 'http';
  readonly sentryEventId?: string;
}

interface MakeErrorOpts {
  code: string;
  retriable: boolean;
  category: 'client' | 'server';
  retry_after_ms?: number;
  text: string;
  structured: Record<string, unknown>;
}

function makeError(opts: MakeErrorOpts): CallToolResult {
  const structured: Record<string, unknown> = {
    code: opts.code,
    retriable: opts.retriable,
    category: opts.category,
    ...opts.structured,
  };
  if (opts.retry_after_ms !== undefined) {
    structured.retry_after_ms = opts.retry_after_ms;
  }
  return {
    isError: true,
    content: [{ type: 'text', text: opts.text }],
    structuredContent: structured,
  };
}

export function formatErrorForUser(e: unknown, ctx: FormatErrorContext): CallToolResult {
  // Plan 8 D.4: surface cockatiel resilience errors with structured retry hints.
  // CircuitOpenError / BulkheadFullError are the user-facing wrappers raised by
  // wrapRestWithResilience.  We also catch the raw cockatiel exceptions for
  // any code path that might pass them in directly (defensive fallback).
  if (e instanceof CircuitOpenError) {
    return makeError({
      code: e.code,
      retriable: true,
      category: 'server',
      retry_after_ms: e.retryAfterMs,
      text:
        `**Upstream Circuit Open**\n\n` +
        `discord-mcp opened the local circuit breaker because Discord REST has been failing repeatedly.\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { retry_after_ms: e.retryAfterMs },
    });
  }
  if (e instanceof BulkheadFullError) {
    return makeError({
      code: e.code,
      retriable: true,
      category: 'server',
      text:
        `**Concurrency Limit Exceeded**\n\n` +
        `Local bulkhead rejected the request — too many concurrent Discord REST calls in flight.\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: {},
    });
  }
  if (e instanceof BulkheadRejectedError) {
    return makeError({
      code: 'BULKHEAD_FULL',
      retriable: true,
      category: 'server',
      text:
        `**Concurrency Limit Exceeded**\n\n` +
        `Local bulkhead rejected the request — too many concurrent Discord REST calls in flight.\n\n` +
        `**Recovery**: concurrency limit exceeded; retry shortly`,
      structured: {},
    });
  }
  // BrokenCircuitError covers IsolatedCircuitError (subclass).
  if (e instanceof BrokenCircuitError) {
    return makeError({
      code: 'CIRCUIT_OPEN',
      retriable: true,
      category: 'server',
      text:
        `**Upstream Circuit Open**\n\n` +
        `discord-mcp opened the local circuit breaker because Discord REST has been failing repeatedly.\n\n` +
        `**Recovery**: wait and retry`,
      structured: {},
    });
  }

  if (e instanceof DiscordPermissionError) {
    const haveStr = e.have.length
      ? e.have.map((p) => `\`${p}\``).join(', ')
      : '_(none on this resource)_';
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Permission Denied** on \`${e.resource}\`\n\n` +
        `**Missing**: ${e.missing.map((p) => `\`${p}\``).join(', ')}\n` +
        `**Bot has**: ${haveStr}\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { missing: [...e.missing], have: [...e.have], resource: e.resource },
    });
  }

  if (e instanceof DiscordRateLimitError) {
    const altLine =
      e.suggestedTool !== undefined
        ? `**Alternative**: use \`${e.suggestedTool}\` to batch.\n`
        : '';
    const structured: Record<string, unknown> = {
      retry_after_ms: e.retryAfterMs,
      bucket: e.bucket,
      scope: e.scope,
    };
    if (e.suggestedTool !== undefined) {
      structured.suggested_tool = e.suggestedTool;
    }
    return makeError({
      code: e.code,
      retriable: true,
      category: 'client',
      retry_after_ms: e.retryAfterMs,
      text:
        `**Rate Limited**\n\n` +
        `Discord ${e.scope} bucket \`${e.bucket}\` hit. Retry after **${e.retryAfterMs}ms**.\n` +
        altLine,
      structured,
    });
  }

  if (e instanceof DiscordNotFoundError) {
    const suggLine =
      e.suggestedTool !== undefined ? `**List available**: \`${e.suggestedTool}\`` : '';
    const structured: Record<string, unknown> = {
      resource_type: e.resourceType,
      id: e.id,
    };
    if (e.suggestedTool !== undefined) {
      structured.suggested_tool = e.suggestedTool;
    }
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Not Found**: ${e.resourceType} \`${e.id}\` not accessible.\n\n` +
        `**Recovery**: ${e.recoveryHint}\n` +
        suggLine,
      structured,
    });
  }

  if (e instanceof ValidationError) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Input Error**\n\n` +
        e.issues.map((i) => `- \`${i.path}\`: ${i.message}`).join('\n') +
        `\n\n**Recovery**: ${e.recoveryHint}`,
      structured: { issues: e.issues.map((i) => ({ ...i })) },
    });
  }

  if (e instanceof DiscordCloudflareBlocked) {
    const until = new Date(Date.now() + e.retryAfterMs).toISOString();
    return makeError({
      code: e.code,
      retriable: true,
      category: 'client',
      retry_after_ms: e.retryAfterMs,
      text:
        `**🚨 CLOUDFLARE BANNED**\n\n` +
        `Bot IP banned ~1h for >10K invalid requests in 10min window.\n` +
        `**STOP** all Discord operations until ${until}.\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { retry_after_ms: e.retryAfterMs },
    });
  }

  if (e instanceof ScopeRejectedError) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Tool Disabled**: \`${e.tool}\` requires scope \`${e.required}\`.\n` +
        `Currently granted: [${e.granted.join(', ')}].\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { tool: e.tool, required: e.required, granted: [...e.granted] },
    });
  }

  if (e instanceof GuildNotAllowedError) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Guild Restricted**: \`${e.guildId}\` not in allowlist.\n\n` +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { guild_id: e.guildId },
    });
  }

  if (e instanceof DryRunPreview) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text:
        `**Dry-Run** (no action taken): would call \`${e.tool}\` with:\n\n` +
        '```json\n' +
        JSON.stringify(e.preview, null, 2) +
        '\n```\n\n' +
        `**Recovery**: ${e.recoveryHint}`,
      structured: { tool: e.tool, preview: e.preview as Record<string, unknown> },
    });
  }

  if (e instanceof CancelledError) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text: `**Cancelled** by client.\n\n${e.recoveryHint ?? ''}`,
      structured: {},
    });
  }

  if (e instanceof DiscordAuthError) {
    return makeError({
      code: e.code,
      retriable: false,
      category: 'client',
      text: `**Authentication Failed**\n\n${e.message}\n\n**Recovery**: ${e.recoveryHint}`,
      structured: {},
    });
  }

  if (e instanceof DiscordServerError) {
    const structured: Record<string, unknown> = {};
    if (ctx.sentryEventId !== undefined) {
      structured.trace_id = ctx.sentryEventId;
    }
    return makeError({
      code: e.code,
      retriable: true,
      category: 'server',
      text:
        `**Discord Upstream Error**\n\n` +
        `${e.message}\n\n` +
        (ctx.sentryEventId !== undefined ? `Tracked: \`${ctx.sentryEventId}\`.\n\n` : '') +
        `**Recovery**: ${e.recoveryHint ?? 'retry'}`,
      structured,
    });
  }

  if (e instanceof DiscordError) {
    return makeError({
      code: e.code,
      retriable: e.retriable,
      category: e.category,
      text:
        `**${e.code}**\n\n${e.message}\n\n` +
        (e.recoveryHint !== undefined ? `**Recovery**: ${e.recoveryHint}` : ''),
      structured: {},
    });
  }

  const structured: Record<string, unknown> = {};
  if (ctx.sentryEventId !== undefined) {
    structured.trace_id = ctx.sentryEventId;
  }
  return makeError({
    code: 'INTERNAL_ERROR',
    retriable: true,
    category: 'server',
    text:
      `**Internal Error in \`${ctx.toolName}\`**\n\n` +
      `Unexpected upstream issue.${ctx.sentryEventId !== undefined ? ` Tracked: \`${ctx.sentryEventId}\`.` : ''}\n` +
      `**Recovery**: retry in 5s. If persistent, contact maintainer with the trace ID.`,
    structured,
  });
}
