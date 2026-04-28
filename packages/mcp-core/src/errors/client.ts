import { DiscordClientError } from './base.js';

export class DiscordPermissionError extends DiscordClientError {
  public readonly code = 'DISCORD_PERMISSION_DENIED';
  public readonly retriable = false;
  public constructor(
    public readonly missing: readonly string[],
    public readonly have: readonly string[],
    public readonly resource: string,
  ) {
    super(`Missing permissions: ${missing.join(', ')} on ${resource}`);
    const first = missing[0] ?? 'permission';
    this.recoveryHint = `Grant ${first} to bot's role in Server Settings → Roles.`;
  }
}

export class DiscordRateLimitError extends DiscordClientError {
  public readonly code = 'DISCORD_RATE_LIMITED';
  public readonly retriable = true;
  public constructor(
    public readonly retryAfterMs: number,
    public readonly bucket: string,
    public readonly scope: 'user' | 'shared' | 'global',
    batchAlternative?: string,
  ) {
    super(`Rate limited on ${bucket} (${scope}). Retry in ${retryAfterMs}ms.`);
    this.recoveryHint = `Wait ${retryAfterMs}ms then retry`;
    if (batchAlternative !== undefined) {
      this.suggestedTool = batchAlternative;
      this.recoveryHint += ` OR batch via ${batchAlternative}`;
    }
  }
}

export class DiscordNotFoundError extends DiscordClientError {
  public readonly code = 'DISCORD_NOT_FOUND';
  public readonly retriable = false;
  public constructor(public readonly resourceType: string, public readonly id: string) {
    super(`${resourceType} ${id} not found`);
    this.recoveryHint = `Verify: 1) ${resourceType} exists 2) bot has VIEW permission 3) ID is correct`;
    this.suggestedTool = `${resourceType.toLowerCase()}s_list`;
  }
}

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

export class ValidationError extends DiscordClientError {
  public readonly code = 'VALIDATION_FAILED';
  public readonly retriable = false;
  public constructor(public readonly issues: readonly ValidationIssue[]) {
    super('Input validation failed');
    const first = issues[0];
    this.recoveryHint = first
      ? `Fix \`${first.path}\`: ${first.message}`
      : 'Check input schema';
  }
}

export class DiscordAuthError extends DiscordClientError {
  public readonly code = 'DISCORD_AUTH_INVALID';
  public readonly retriable = false;
  public override recoveryHint =
    'Bot token invalid or revoked. Set DISCORD_TOKEN env to a fresh token.';
}

export class DiscordCloudflareBlocked extends DiscordClientError {
  public readonly code = 'DISCORD_CLOUDFLARE_BLOCKED';
  public readonly retriable = true;
  public constructor(public readonly retryAfterMs: number = 3_600_000) {
    super('Cloudflare 1015 — exceeded 10K invalid requests / 10 min');
    this.recoveryHint = `IP-banned for ~1h. STOP all Discord requests. Investigate which tool spammed invalid args.`;
  }
}
