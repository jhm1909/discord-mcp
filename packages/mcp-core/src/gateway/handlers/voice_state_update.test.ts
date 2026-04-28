import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { SubscriptionRegistry } from '../subscription_registry.js';
import { bindVoiceStateUpdateHandler } from './voice_state_update.js';

describe('bindVoiceStateUpdateHandler', () => {
  it('notifies subscribed URI on voiceStateUpdate', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    registry.subscribe('discord://voice/g_123/state');

    bindVoiceStateUpdateHandler({ client: fakeClient as never, registry, notifyResource: notify });
    fakeClient.emit('voiceStateUpdate', null, { guild: { id: 'g_123' } });
    expect(notify).toHaveBeenCalledWith('discord://voice/g_123/state');
  });

  it('skips unsubscribed URIs', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    bindVoiceStateUpdateHandler({ client: fakeClient as never, registry, notifyResource: notify });
    fakeClient.emit('voiceStateUpdate', null, { guild: { id: 'g_999' } });
    expect(notify).not.toHaveBeenCalled();
  });

  it('teardown unsubscribes listener', () => {
    const fakeClient = new EventEmitter();
    const registry = new SubscriptionRegistry();
    const notify = vi.fn();
    registry.subscribe('discord://voice/g_123/state');
    const teardown = bindVoiceStateUpdateHandler({
      client: fakeClient as never,
      registry,
      notifyResource: notify,
    });
    teardown();
    fakeClient.emit('voiceStateUpdate', null, { guild: { id: 'g_123' } });
    expect(notify).not.toHaveBeenCalled();
  });
});
