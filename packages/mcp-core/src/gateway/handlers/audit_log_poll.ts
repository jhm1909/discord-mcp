import type { SubscriptionRegistry } from '../subscription_registry.js';

const URI_RE = /^discord:\/\/guild\/(\d+)\/audit-log\/recent$/;

export interface AuditPollDeps {
  registry: SubscriptionRegistry;
  notifyResource: (uri: string) => Promise<void> | void;
  fetchAuditLog: (guildId: string) => Promise<{ audit_log_entries: Array<{ id: string }> }>;
  pollIntervalMs: number;
}

export function bindAuditLogPollHandler(deps: AuditPollDeps): () => void {
  const lastSeen = new Map<string, string | null>();
  const tick = async (): Promise<void> => {
    const uris = deps.registry.matchPattern(URI_RE);
    for (const uri of uris) {
      const match = URI_RE.exec(uri);
      if (match === null) continue;
      const guildId = match[1]!;
      try {
        const log = await deps.fetchAuditLog(guildId);
        const latestId = log.audit_log_entries[0]?.id ?? null;
        const previous = lastSeen.get(uri);
        if (latestId !== null && previous !== latestId) {
          lastSeen.set(uri, latestId);
          await deps.notifyResource(uri);
        }
      } catch {
        // best-effort
      }
    }
  };
  const interval = setInterval(() => void tick(), deps.pollIntervalMs);
  return () => clearInterval(interval);
}
