import { describe, expect, it } from 'vitest';

import { InMemoryDailyVoiceQuota } from './voice-quota.js';

describe('InMemoryDailyVoiceQuota', () => {
  it('limits an installation', () => {
    const quota = new InMemoryDailyVoiceQuota(2);
    expect(quota.consume('install-a')).toBe(true);
    expect(quota.consume('install-a')).toBe(true);
    expect(quota.consume('install-a')).toBe(false);
    expect(quota.consume('install-b')).toBe(true);
  });
});
