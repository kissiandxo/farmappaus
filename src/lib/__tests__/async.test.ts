import { TimeoutError, withTimeout } from '../async';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves with the value when the promise is quick enough', async () => {
    const result = withTimeout(Promise.resolve('farms'), 1000);
    await expect(result).resolves.toBe('farms');
  });

  it('passes the original error through', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });

  it('rejects with a TimeoutError when the promise is too slow', async () => {
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 5000);
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    jest.advanceTimersByTime(5000);
    await assertion;
  });

  it('does not leave a timer running after success', async () => {
    await withTimeout(Promise.resolve(1), 1000);
    expect(jest.getTimerCount()).toBe(0);
  });
});
