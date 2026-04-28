import type { SubscriptionRegistry } from '../subscription_registry.js';

export interface HandlerDeps {
  client: {
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
    off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  };
  registry: SubscriptionRegistry;
  notifyResource: (uri: string) => Promise<void> | void;
}

export function bindVoiceStateUpdateHandler(deps: HandlerDeps): () => void {
  const handler = (_old: unknown, newState: { guild: { id: string } }): void => {
    const uri = `discord://voice/${newState.guild.id}/state`;
    if (deps.registry.has(uri)) {
      void deps.notifyResource(uri);
    }
  };
  deps.client.on('voiceStateUpdate', handler as never);
  return () => deps.client.off('voiceStateUpdate', handler as never);
}
