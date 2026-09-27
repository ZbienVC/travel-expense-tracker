import { describe, expect, it, vi } from 'vitest';
import { APIError, withRetry, withTimeout } from './errorHandler';

vi.mock('../logger', () => ({ default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe('withRetry', () => {
  it('returns the result when the call works the first time', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('tries again after a retryable error, like a 503', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('Request failed with status: 503')).mockResolvedValue('ok');
    await expect(withRetry(fn, { initialDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up right away on an error that will not fix itself, like a 400', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Request failed with status: 400'));
    await expect(withRetry(fn, { initialDelayMs: 1 })).rejects.toThrow('400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops after the most attempts allowed', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('status: 500'));
    await expect(withRetry(fn, { maxAttempts: 3, initialDelayMs: 1 })).rejects.toThrow('500');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('withTimeout', () => {
  it('passes the result through when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 50)).resolves.toBe(42);
  });

  it('fails with a 408 timeout error when the work takes too long', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 200));
    const err = await withTimeout(slow, 10, 'Too slow').catch((e) => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err.statusCode).toBe(408);
    expect(err.message).toBe('Too slow');
  });
});
