import { describe, expect, it } from 'vitest';

import type { StoredAnalyticsEvent } from './event-store.js';
import { summarizeAnalytics } from './summary.js';

function event(
  name: StoredAnalyticsEvent['name'],
  installationHash: string,
  occurredAt: string,
  properties: StoredAnalyticsEvent['properties'] = {},
): StoredAnalyticsEvent {
  return {
    name,
    installationHash,
    occurredAt,
    receivedAt: occurredAt,
    properties,
  };
}

describe('summarizeAnalytics', () => {
  it('separates unique users from event frequency', () => {
    const summary = summarizeAnalytics([
      event('site_viewed', 'web-a', '2026-10-21T01:00:00.000Z'),
      event('site_viewed', 'web-b', '2026-10-21T01:00:00.000Z'),
      event('download_started', 'web-a', '2026-10-21T01:01:00.000Z'),
      event('app_opened', 'install-a', '2026-10-21T02:00:00.000Z'),
      event('app_opened', 'install-a', '2026-10-21T03:00:00.000Z'),
      event('voice_saved', 'install-a', '2026-10-21T03:01:00.000Z', { entryCount: 2 }),
      event('voice_saved', 'install-a', '2026-10-21T03:02:00.000Z', { entryCount: 1 }),
      event('manual_transaction_created', 'install-a', '2026-10-21T03:03:00.000Z'),
    ]);

    expect(summary.siteVisitors).toBe(2);
    expect(summary.downloadVisitors).toBe(1);
    expect(summary.downloadConversionRate).toBe(0.5);
    expect(summary.activeUsers).toBe(1);
    expect(summary.appOpens).toBe(2);
    expect(summary.appOpensPerActiveUser).toBe(2);
    expect(summary.voiceEntriesRecorded).toBe(3);
    expect(summary.totalEntriesCreated).toBe(4);
    expect(summary.activatedUsers).toBe(1);
    expect(summary.activationRate).toBe(1);
  });

  it('reports activation, retention, feature adoption, platform and failures', () => {
    const summary = summarizeAnalytics([
      event('app_opened', 'install-a', '2026-10-01T01:00:00.000Z', {
        platform: 'android',
        appVersion: '0.1.1',
      }),
      event('app_opened', 'install-a', '2026-10-02T01:00:00.000Z', {
        platform: 'android',
        appVersion: '0.1.1',
      }),
      event('app_backgrounded', 'install-a', '2026-10-02T01:10:00.000Z', {
        durationMs: 60_000,
      }),
      event('voice_started', 'install-a', '2026-10-02T01:01:00.000Z'),
      event('voice_completed', 'install-a', '2026-10-02T01:01:01.000Z', {
        entryCount: 2,
        durationMs: 1200,
      }),
      event('voice_saved', 'install-a', '2026-10-02T01:01:02.000Z', { entryCount: 2 }),
      event('voice_failed', 'install-a', '2026-10-02T01:02:00.000Z', {
        reason: 'timeout',
      }),
      event('app_opened', 'install-b', '2026-10-01T02:00:00.000Z', {
        platform: 'ios',
        appVersion: '0.1.1',
      }),
      event('manual_transaction_created', 'install-b', '2026-10-01T02:01:00.000Z'),
      event('stats_opened', 'install-b', '2026-10-01T02:02:00.000Z'),
    ]);

    expect(summary.activeUsers).toBe(2);
    expect(summary.activatedUsers).toBe(2);
    expect(summary.d1Retention).toMatchObject({
      eligibleUsers: 2,
      retainedUsers: 1,
      rate: 0.5,
    });
    expect(summary.averageSessionSeconds).toBe(60);
    expect(summary.voiceLatencyP50Ms).toBe(1200);
    expect(summary.failureReasons).toEqual([{ reason: 'timeout', count: 1 }]);
    expect(summary.featureUsers).toMatchObject({ voice: 1, manual: 1, stats: 1 });
    expect(summary.platforms).toEqual([
      { key: 'android', activeUsers: 1 },
      { key: 'ios', activeUsers: 1 },
    ]);
  });
});
