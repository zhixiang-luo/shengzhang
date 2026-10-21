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
  });
});
