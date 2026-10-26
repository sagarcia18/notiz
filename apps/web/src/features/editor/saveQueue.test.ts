import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveQueue, type SaveStatus } from './saveQueue';

function deferred(): { promise: Promise<void>; resolve: () => void; reject: () => void } {
  let resolve = (): void => undefined;
  let reject = (): void => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = () => rej(new Error('failed'));
  });
  return { promise, resolve, reject };
}

describe('SaveQueue', () => {
  let statuses: SaveStatus[];

  beforeEach(() => {
    vi.useFakeTimers();
    statuses = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createQueue(save: (value: string) => Promise<void>): SaveQueue<string> {
    return new SaveQueue({ save, delayMs: 500, onStatus: (status) => statuses.push(status) });
  }

  it('saves only the latest value after the delay', async () => {
    const save = vi.fn(() => Promise.resolve());
    const queue = createQueue(save);
    queue.schedule('a');
    queue.schedule('ab');
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledExactlyOnceWith('ab');
    expect(statuses.at(-1)).toBe('saved');
  });

  it('never runs two saves at once and saves changes made during a save', async () => {
    const first = deferred();
    const save = vi.fn((value: string) => (value === 'one' ? first.promise : Promise.resolve()));
    const queue = createQueue(save);
    queue.schedule('one');
    await vi.advanceTimersByTimeAsync(500);
    queue.schedule('two');
    const flushed = queue.flush();
    expect(save).toHaveBeenCalledTimes(1);
    first.resolve();
    await flushed;
    expect(save.mock.calls).toEqual([['one'], ['two']]);
    expect(queue.hasPending()).toBe(false);
  });

  it('keeps a failed value and retries it on the next flush only', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const queue = createQueue(save);
    queue.schedule('draft');
    await vi.advanceTimersByTimeAsync(500);
    expect(statuses.at(-1)).toBe('error');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledTimes(1);

    await queue.flush();
    expect(save).toHaveBeenLastCalledWith('draft');
    expect(statuses.at(-1)).toBe('saved');
  });
});
