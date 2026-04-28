import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindAuditLogPollHandler } from './audit_log_poll.js';
import { SubscriptionRegistry } from '../subscription_registry.js';

describe('bindAuditLogPollHandler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('polls audit log every interval for each subscribed guild URI', async () => {
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://guild/111/audit-log/recent');
    registry.subscribe('discord://guild/222/audit-log/recent');
    const fetchAuditLog = vi.fn().mockResolvedValue({ audit_log_entries: [{ id: 'e1' }] });
    const notify = vi.fn();

    const teardown = bindAuditLogPollHandler({
      registry,
      notifyResource: notify,
      fetchAuditLog,
      pollIntervalMs: 60_000,
    });

    expect(fetchAuditLog).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchAuditLog).toHaveBeenCalledWith('111');
    expect(fetchAuditLog).toHaveBeenCalledWith('222');
    teardown();
  });

  it('only notifies when latest entry id changes', async () => {
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://guild/111/audit-log/recent');
    const fetchAuditLog = vi.fn()
      .mockResolvedValueOnce({ audit_log_entries: [{ id: 'e1' }] })
      .mockResolvedValueOnce({ audit_log_entries: [{ id: 'e1' }] })
      .mockResolvedValueOnce({ audit_log_entries: [{ id: 'e2' }] });
    const notify = vi.fn();

    const teardown = bindAuditLogPollHandler({
      registry,
      notifyResource: notify,
      fetchAuditLog,
      pollIntervalMs: 60_000,
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(notify).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(notify).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(notify).toHaveBeenCalledTimes(2);
    teardown();
  });

  it('teardown stops polling', async () => {
    const registry = new SubscriptionRegistry();
    registry.subscribe('discord://guild/111/audit-log/recent');
    const fetchAuditLog = vi.fn().mockResolvedValue({ audit_log_entries: [] });
    const notify = vi.fn();

    const teardown = bindAuditLogPollHandler({
      registry,
      notifyResource: notify,
      fetchAuditLog,
      pollIntervalMs: 60_000,
    });
    teardown();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchAuditLog).not.toHaveBeenCalled();
  });
});
