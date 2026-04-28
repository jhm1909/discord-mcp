import { DiscordServerError } from './base.js';

export class DiscordServerErrorImpl extends DiscordServerError {
  public readonly code = 'DISCORD_SERVER_ERROR';
  public constructor(public readonly status: number, public readonly route: string) {
    super(`Discord ${status} on ${route}`);
    this.recoveryHint =
      'Discord upstream issue. Auto-retry in progress; check status.discord.com if persistent.';
  }
}

export class InternalError extends DiscordServerError {
  public readonly code = 'INTERNAL_ERROR';
  public override recoveryHint = 'Internal MCP server error. Check audit log + Sentry event.';
}
