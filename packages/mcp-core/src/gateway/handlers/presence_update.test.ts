import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionRegistry } from '../subscription_registry.js';
import { bindPresenceUpdateHandler } from './presence_update.js';

describe('bindPresenceUpdateHandler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('notifies subscribed URI after 1s debounce', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://guild/g1/members/online');
    const notify = vi.fn();
    bindPresenceUpdateHandler({ client: fakeClient as never, registry, notifyResource: notify });

    fakeClient.emit('presenceUpdate', null, { guild: { id: 'g1' } });
    fakeClient.emit('presenceUpdate', null, { guild: { id: 'g1' } });
    fakeClient.emit('presenceUpdate', null, { guild: { id: 'g1' } });
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('discord://guild/g1/members/online');
  });

  it('skips unsubscribed URIs', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    bindPresenceUpdateHandler({ client: fakeClient as never, registry, notifyResource: notify });
    fakeClient.emit('presenceUpdate', null, { guild: { id: 'g_unknown' } });
    vi.advanceTimersByTime(1000);
    expect(notify).not.toHaveBeenCalled();
  });

  it('teardown removes listener', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://guild/g1/members/online');
    const notify = vi.fn();
    const teardown = bindPresenceUpdateHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });
    teardown();
    fakeClient.emit('presenceUpdate', null, { guild: { id: 'g1' } });
    vi.advanceTimersByTime(1000);
    expect(notify).not.toHaveBeenCalled();
  });
});
