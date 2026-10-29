import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PausableTimer } from './pausableTimer';

describe('PausableTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the callback after the delay', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire early when paused before the deadline', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('fires after the remaining delay once resumed', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(10000);
    timer.resume();
    vi.advanceTimersByTime(2999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops firing when cleared', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    timer.clear();
    vi.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('fires once when started twice', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    timer.start();
    vi.advanceTimersByTime(4000);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps correct remaining after pause called twice then resume', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.pause();
    timer.pause();
    vi.advanceTimersByTime(5000);
    timer.resume();
    vi.advanceTimersByTime(2999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('treats resume without pause as a noop', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.resume();
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.resume();
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('preserves total remaining across multiple pause/resume cycles', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(2000);
    timer.resume();
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(3000);
    timer.resume();
    vi.advanceTimersByTime(1999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('never fires after clear then resume', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    timer.start();
    vi.advanceTimersByTime(1000);
    timer.clear();
    timer.resume();
    vi.advanceTimersByTime(10000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('reflects pause lifecycle in the paused getter', () => {
    const callback = vi.fn();
    const timer = new PausableTimer(callback, 4000);
    expect(timer.paused).toBe(false);
    timer.start();
    expect(timer.paused).toBe(false);
    timer.pause();
    expect(timer.paused).toBe(true);
    timer.resume();
    expect(timer.paused).toBe(false);
    timer.pause();
    timer.clear();
    expect(timer.paused).toBe(false);
  });
});
