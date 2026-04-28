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
