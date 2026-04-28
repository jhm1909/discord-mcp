import type { SubscriptionRegistry } from '../subscription_registry.js';

export interface HandlerDeps {
  client: {
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
    off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  };
  registry: SubscriptionRegistry;
  notifyResource: (uri: string) => Promise<void> | void;
}

export function bindGuildUpdateHandler(deps: HandlerDeps): () => void {
  const handler = (_old: unknown, after: { id: string }): void => {
    const uri = `discord://guild/${after.id}/info`;
    if (deps.registry.has(uri)) {
      void deps.notifyResource(uri);
    }
  };
  deps.client.on('guildUpdate', handler as never);
  return () => deps.client.off('guildUpdate', handler as never);
}
