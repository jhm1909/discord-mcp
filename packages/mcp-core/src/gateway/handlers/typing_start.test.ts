import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionRegistry } from '../subscription_registry.js';
import { bindTypingStartHandler } from './typing_start.js';

describe('bindTypingStartHandler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces 3 events within 5s into 1 notify', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://channel/c1/typing');
    const notify = vi.fn();
    bindTypingStartHandler({ client: fakeClient as never, registry, notifyResource: notify });

    fakeClient.emit('typingStart', { channel: { id: 'c1' } });
    fakeClient.emit('typingStart', { channel: { id: 'c1' } });
    fakeClient.emit('typingStart', { channel: { id: 'c1' } });
    expect(notify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('discord://channel/c1/typing');
  });

  it('skips unsubscribed channels', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    bindTypingStartHandler({ client: fakeClient as never, registry, notifyResource: notify });
    fakeClient.emit('typingStart', { channel: { id: 'c2' } });
    vi.advanceTimersByTime(5000);
    expect(notify).not.toHaveBeenCalled();
  });

  it('teardown removes listener', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://channel/c1/typing');
    const notify = vi.fn();
    const teardown = bindTypingStartHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });
    teardown();
    fakeClient.emit('typingStart', { channel: { id: 'c1' } });
    vi.advanceTimersByTime(5000);
    expect(notify).not.toHaveBeenCalled();
  });
});
