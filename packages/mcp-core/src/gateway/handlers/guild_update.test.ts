import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionRegistry } from '../subscription_registry.js';
import { bindGuildUpdateHandler } from './guild_update.js';

describe('bindGuildUpdateHandler', () => {
  it('notifies subscribed URI on guildUpdate', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    registry.subscribe('discord://guild/123/info');

    bindGuildUpdateHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });

    fakeClient.emit('guildUpdate', null, { id: '123' });
    expect(notify).toHaveBeenCalledWith('discord://guild/123/info');
  });

  it('skips unsubscribed URIs', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();

    bindGuildUpdateHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });

    fakeClient.emit('guildUpdate', null, { id: '999' });
    expect(notify).not.toHaveBeenCalled();
  });

  it('returns a teardown function that unsubscribes the listener', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    registry.subscribe('discord://guild/123/info');

    const teardown = bindGuildUpdateHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });

    teardown();
    fakeClient.emit('guildUpdate', null, { id: '123' });
    expect(notify).not.toHaveBeenCalled();
  });
});
