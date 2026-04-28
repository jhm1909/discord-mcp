export { DiscordClientError, DiscordError, DiscordServerError } from './base.js';
export {
  CancelledError,
  DiscordAuthError,
  DiscordCloudflareBlocked,
  DiscordNotFoundError,
  DiscordPermissionError,
  DiscordRateLimitError,
  DryRunPreview,
  GuildNotAllowedError,
  ScopeRejectedError,
  ValidationError,
  type ValidationIssue,
} from './client.js';
export { DiscordServerErrorImpl, InternalError } from './server.js';
