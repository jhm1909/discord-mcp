import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncer } from './debounce.js';

describe('createDebouncer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires once when called once after delay', () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);
    debounced('a');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('coalesces multiple calls within the window into one fire', () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);
    debounced('a');
    debounced('b');
    debounced('c');
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('separates calls outside the window into separate fires', () => {
    const fn = vi.fn();
    const debounced = createDebouncer(fn, 1000);
    debounced('a');
    vi.advanceTimersByTime(1500);
    debounced('b');
    vi.advanceTimersByTime(1500);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'a');
    expect(fn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('passes through multiple arguments', () => {
    const fn = vi.fn();
    const debounced = createDebouncer<[string, number]>((key, value) => fn(key, value), 1000);
    debounced('userA', 1);
    debounced('userA', 3);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('userA', 3);
  });
});
