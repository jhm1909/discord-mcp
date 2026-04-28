import { describe, it, expect } from 'vitest';
import { SubscriptionRegistry } from './subscription_registry.js';

describe('SubscriptionRegistry', () => {
  it('starts empty', () => {
    const r = new SubscriptionRegistry();
    expect(r.size).toBe(0);
    expect(r.list()).toEqual([]);
  });

  it('subscribe adds the URI; has() returns true', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('discord://guild/123/info');
    expect(r.has('discord://guild/123/info')).toBe(true);
    expect(r.size).toBe(1);
  });

  it('idempotent: subscribing twice does not duplicate', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('discord://guild/123/info');
    r.subscribe('discord://guild/123/info');
    expect(r.size).toBe(1);
  });

  it('unsubscribe removes; has() returns false', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('discord://guild/123/info');
    r.unsubscribe('discord://guild/123/info');
    expect(r.has('discord://guild/123/info')).toBe(false);
    expect(r.size).toBe(0);
  });

  it('unsubscribe is idempotent (no error if not present)', () => {
    const r = new SubscriptionRegistry();
    expect(() => r.unsubscribe('discord://nothing')).not.toThrow();
  });

  it('list returns all subscribed URIs', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('a');
    r.subscribe('b');
    r.subscribe('c');
    expect(r.list().sort()).toEqual(['a', 'b', 'c']);
  });

  it('matchPattern finds all subscribed URIs matching a regex', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('discord://guild/123/info');
    r.subscribe('discord://guild/456/info');
    r.subscribe('discord://channel/789/typing');
    const matches = r.matchPattern(/^discord:\/\/guild\/\d+\/info$/);
    expect(matches.sort()).toEqual(['discord://guild/123/info', 'discord://guild/456/info']);
  });

  it('clear removes all subscriptions', () => {
    const r = new SubscriptionRegistry();
    r.subscribe('a');
    r.subscribe('b');
    r.clear();
    expect(r.size).toBe(0);
  });
});
