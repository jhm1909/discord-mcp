export abstract class DiscordError extends Error {
  /** Canonical SCREAMING_SNAKE error code, e.g. DISCORD_PERMISSION_DENIED. */
  public abstract readonly code: string;

  /** Whether the agent should retry this call as-is. */
  public abstract readonly retriable: boolean;

  /** 'client' = 4xx (user fault, no Sentry log). 'server' = 5xx (log + breaker count). */
  public abstract readonly category: 'client' | 'server';

  /** Plain text recovery suggestion, surfaced to the agent. */
  public recoveryHint?: string;

  /** Optional alternate tool the agent can try instead. */
  public suggestedTool?: string;

  public constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 4xx-class errors: caused by the caller, never logged to Sentry. */
export abstract class DiscordClientError extends DiscordError {
  public readonly category = 'client' as const;
}

/** 5xx-class errors: caused by upstream, logged to Sentry, increment circuit-breaker counter. */
export abstract class DiscordServerError extends DiscordError {
  public readonly category = 'server' as const;
  public readonly retriable: boolean = true;
}
