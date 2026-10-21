import { shanghaiDateKey } from './voice-quota.js';

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export class InMemoryFixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private operations = 0;

  consume(key: string, rule: RateLimitRule, now = Date.now()): RateLimitDecision {
    this.operations += 1;
    if (this.operations % 500 === 0) this.prune(now);

    const current = this.buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + rule.windowMs,
          };

    if (bucket.count >= rule.limit) {
      this.buckets.set(key, bucket);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    this.buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.max(0, rule.limit - bucket.count),
      retryAfterSeconds: 0,
    };
  }

  private prune(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

export type VoiceAccessPolicy = {
  ipMinuteLimit: number;
  ipDailyLimit: number;
  globalMinuteLimit: number;
  globalDailyLimit: number;
};

export type VoiceAccessDenialReason =
  | 'IP_MINUTE_LIMIT'
  | 'IP_DAILY_LIMIT'
  | 'GLOBAL_MINUTE_LIMIT'
  | 'GLOBAL_DAILY_LIMIT';

export type VoiceAccessDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: VoiceAccessDenialReason;
      retryAfterSeconds: number;
    };

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class VoiceAccessGuard {
  constructor(
    private readonly limiter: InMemoryFixedWindowRateLimiter,
    private readonly policy: VoiceAccessPolicy,
  ) {}

  consume(ipAddress: string, now = Date.now()): VoiceAccessDecision {
    const ip = ipAddress.trim().slice(0, 100) || 'unknown';
    const date = shanghaiDateKey(new Date(now));

    const checks: Array<{
      key: string;
      limit: number;
      windowMs: number;
      reason: VoiceAccessDenialReason;
    }> = [
      {
        key: `voice:ip-minute:${ip}`,
        limit: this.policy.ipMinuteLimit,
        windowMs: MINUTE_MS,
        reason: 'IP_MINUTE_LIMIT',
      },
      {
        key: `voice:ip-day:${date}:${ip}`,
        limit: this.policy.ipDailyLimit,
        windowMs: DAY_MS,
        reason: 'IP_DAILY_LIMIT',
      },
      {
        key: 'voice:global-minute',
        limit: this.policy.globalMinuteLimit,
        windowMs: MINUTE_MS,
        reason: 'GLOBAL_MINUTE_LIMIT',
      },
      {
        key: `voice:global-day:${date}`,
        limit: this.policy.globalDailyLimit,
        windowMs: DAY_MS,
        reason: 'GLOBAL_DAILY_LIMIT',
      },
    ];

    for (const check of checks) {
      const decision = this.limiter.consume(
        check.key,
        { limit: check.limit, windowMs: check.windowMs },
        now,
      );
      if (!decision.allowed) {
        return {
          allowed: false,
          reason: check.reason,
          retryAfterSeconds: decision.retryAfterSeconds,
        };
      }
    }

    return { allowed: true };
  }
}
