import { describe, expect, it } from 'vitest';

import {
  InMemoryFixedWindowRateLimiter,
  VoiceAccessGuard,
} from './rate-limit.js';

describe('InMemoryFixedWindowRateLimiter', () => {
  it('limits a key until its window resets', () => {
    const limiter = new InMemoryFixedWindowRateLimiter();
    const rule = { limit: 2, windowMs: 1000 };

    expect(limiter.consume('client', rule, 1000).allowed).toBe(true);
    expect(limiter.consume('client', rule, 1100).allowed).toBe(true);
    expect(limiter.consume('client', rule, 1200)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(limiter.consume('client', rule, 2001).allowed).toBe(true);
  });
});

describe('VoiceAccessGuard', () => {
  const policy = {
    ipMinuteLimit: 2,
    ipDailyLimit: 3,
    globalMinuteLimit: 10,
    globalDailyLimit: 20,
  };

  it('blocks a burst from one IP before using the global budget', () => {
    const guard = new VoiceAccessGuard(new InMemoryFixedWindowRateLimiter(), policy);
    const now = Date.UTC(2026, 9, 21, 8, 0, 0);

    expect(guard.consume('203.0.113.8', now).allowed).toBe(true);
    expect(guard.consume('203.0.113.8', now + 1000).allowed).toBe(true);
    expect(guard.consume('203.0.113.8', now + 2000)).toMatchObject({
      allowed: false,
      reason: 'IP_MINUTE_LIMIT',
    });
  });

  it('applies a global limit across changing IPs', () => {
    const guard = new VoiceAccessGuard(new InMemoryFixedWindowRateLimiter(), {
      ...policy,
      globalMinuteLimit: 2,
    });
    const now = Date.UTC(2026, 9, 21, 8, 0, 0);

    expect(guard.consume('203.0.113.1', now).allowed).toBe(true);
    expect(guard.consume('203.0.113.2', now).allowed).toBe(true);
    expect(guard.consume('203.0.113.3', now)).toMatchObject({
      allowed: false,
      reason: 'GLOBAL_MINUTE_LIMIT',
    });
  });
});
