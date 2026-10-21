import type { StoredAnalyticsEvent } from './event-store.js';

export type AnalyticsSummaryOptions = {
  fromDate?: string;
  toDate?: string;
};

export type DailyAnalyticsSummary = {
  date: string;
  siteVisitors: number;
  activeUsers: number;
  appOpens: number;
  downloadVisitors: number;
  voiceStarted: number;
  voiceSaved: number;
  voiceFailed: number;
  recordedEntries: number;
};

export type RetentionSummary = {
  eligibleUsers: number;
  retainedUsers: number;
  rate: number | null;
};

export type BreakdownSummary = {
  key: string;
  activeUsers: number;
};

export type AnalyticsSummary = {
  totalEvents: number;
  siteViews: number;
  siteVisitors: number;
  downloadVisitors: number;
  downloadStarts: number;
  downloadConversionRate: number | null;
  downloadToActiveRate: number | null;
  activeUsers: number;
  activatedUsers: number;
  activationRate: number | null;
  appOpens: number;
  appOpensPerActiveUser: number | null;
  averageActiveDaysPerUser: number | null;
  averageSessionSeconds: number | null;
  d1Retention: RetentionSummary;
  d7Retention: RetentionSummary;
  voiceStarted: number;
  voiceCompleted: number;
  voiceSaved: number;
  voiceUndone: number;
  voiceCancelled: number;
  voiceFailed: number;
  voiceCompletionRate: number | null;
  voiceSaveRate: number | null;
  voiceEntriesRecorded: number;
  voiceLatencyP50Ms: number | null;
  voiceLatencyP95Ms: number | null;
  manualEntryOpened: number;
  manualTransactionsCreated: number;
  statsOpened: number;
  categoriesOpened: number;
  totalEntriesCreated: number;
  averageEntriesPerActiveUser: number | null;
  featureUsers: {
    voice: number;
    manual: number;
    stats: number;
    categories: number;
  };
  platforms: BreakdownSummary[];
  appVersions: BreakdownSummary[];
  failureReasons: Array<{ reason: string; count: number }>;
  daily: DailyAnalyticsSummary[];
};

function uniqueCount(values: Iterable<string>): number {
  return new Set(values).size;
}

function eventDate(event: StoredAnalyticsEvent): string {
  const date = new Date(event.occurredAt);
  return Number.isNaN(date.getTime())
    ? event.receivedAt.slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function addDays(dateKey: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function percentile(values: number[], percentage: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1);
  return sorted[Math.max(0, index)] ?? null;
}

function breakdown(
  events: StoredAnalyticsEvent[],
  property: 'platform' | 'appVersion',
): BreakdownSummary[] {
  const users = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.name !== 'app_opened') continue;
    const key = event.properties[property] || 'unknown';
    const set = users.get(key) ?? new Set<string>();
    set.add(event.installationHash);
    users.set(key, set);
  }
  return [...users.entries()]
    .map(([key, set]) => ({ key, activeUsers: set.size }))
    .sort((left, right) => right.activeUsers - left.activeUsers || left.key.localeCompare(right.key));
}

function retention(
  activeDatesByUser: Map<string, Set<string>>,
  dayOffset: number,
  reportEnd: string,
): RetentionSummary {
  let eligibleUsers = 0;
  let retainedUsers = 0;
  for (const dates of activeDatesByUser.values()) {
    const firstDate = [...dates].sort()[0];
    if (!firstDate) continue;
    const targetDate = addDays(firstDate, dayOffset);
    if (targetDate > reportEnd) continue;
    eligibleUsers += 1;
    if (dates.has(targetDate)) retainedUsers += 1;
  }
  return {
    eligibleUsers,
    retainedUsers,
    rate: ratio(retainedUsers, eligibleUsers),
  };
}

export function summarizeAnalytics(
  allEvents: StoredAnalyticsEvent[],
  options: AnalyticsSummaryOptions = {},
): AnalyticsSummary {
  const events = allEvents.filter((event) => {
    const date = eventDate(event);
    if (options.fromDate && date < options.fromDate) return false;
    if (options.toDate && date > options.toDate) return false;
    return true;
  });
  const reportEnd =
    options.toDate ??
    events.map(eventDate).sort().at(-1) ??
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  const retentionEvents = allEvents.filter((event) => eventDate(event) <= reportEnd);
  const activeDatesByUser = new Map<string, Set<string>>();
  for (const event of retentionEvents) {
    if (event.name !== 'app_opened') continue;
    const dates = activeDatesByUser.get(event.installationHash) ?? new Set<string>();
    dates.add(eventDate(event));
    activeDatesByUser.set(event.installationHash, dates);
  }

  const siteViews = events.filter((event) => event.name === 'site_viewed').length;
  const siteVisitors = uniqueCount(
    events.filter((event) => event.name === 'site_viewed').map((event) => event.installationHash),
  );
  const downloadEvents = events.filter((event) => event.name === 'download_started');
  const downloadVisitors = uniqueCount(downloadEvents.map((event) => event.installationHash));
  const activeUserEvents = events.filter((event) => event.name === 'app_opened');
  const activeUsers = uniqueCount(activeUserEvents.map((event) => event.installationHash));
  const activatedUsers = uniqueCount(
    events
      .filter(
        (event) =>
          event.name === 'voice_saved' || event.name === 'manual_transaction_created',
      )
      .map((event) => event.installationHash),
  );
  const voiceStartedEvents = events.filter((event) => event.name === 'voice_started');
  const voiceCompletedEvents = events.filter((event) => event.name === 'voice_completed');
  const voiceSavedEvents = events.filter((event) => event.name === 'voice_saved');
  const voiceFailedEvents = events.filter((event) => event.name === 'voice_failed');
  const voiceEntriesRecorded = voiceSavedEvents.reduce(
    (total, event) => total + (event.properties.entryCount ?? 0),
    0,
  );
  const manualTransactionsCreated = events.filter(
    (event) => event.name === 'manual_transaction_created',
  ).length;
  const sessionDurations = events
    .filter((event) => event.name === 'app_backgrounded')
    .map((event) => event.properties.durationMs)
    .filter((duration): duration is number => typeof duration === 'number');
  const voiceDurations = voiceCompletedEvents
    .map((event) => event.properties.durationMs)
    .filter((duration): duration is number => typeof duration === 'number');
  const failureReasons = new Map<string, number>();
  for (const event of voiceFailedEvents) {
    const reason = event.properties.reason ?? 'unknown';
    failureReasons.set(reason, (failureReasons.get(reason) ?? 0) + 1);
  }
  const daily = new Map<
    string,
    {
      siteHashes: Set<string>;
      activeHashes: Set<string>;
      downloadHashes: Set<string>;
      appOpens: number;
      voiceStarted: number;
      voiceSaved: number;
      voiceFailed: number;
      recordedEntries: number;
    }
  >();

  for (const event of events) {
    const date = eventDate(event);
    const entry = daily.get(date) ?? {
      siteHashes: new Set<string>(),
      activeHashes: new Set<string>(),
      downloadHashes: new Set<string>(),
      appOpens: 0,
      voiceStarted: 0,
      voiceSaved: 0,
      voiceFailed: 0,
      recordedEntries: 0,
    };
    if (event.name === 'site_viewed') entry.siteHashes.add(event.installationHash);
    if (event.name === 'app_opened') {
      entry.activeHashes.add(event.installationHash);
      entry.appOpens += 1;
    }
    if (event.name === 'download_started') entry.downloadHashes.add(event.installationHash);
    if (event.name === 'voice_started') entry.voiceStarted += 1;
    if (event.name === 'voice_failed') entry.voiceFailed += 1;
    if (event.name === 'voice_saved') {
      entry.voiceSaved += 1;
      entry.recordedEntries += event.properties.entryCount ?? 0;
    }
    daily.set(date, entry);
  }

  const activeHashesInPeriod = new Set(
    activeUserEvents.map((event) => event.installationHash),
  );
  const activeDayTotal = [...activeDatesByUser.entries()]
    .filter(([hash]) => activeHashesInPeriod.has(hash))
    .reduce((total, [, dates]) => total + dates.size, 0);
  const totalEntriesCreated = voiceEntriesRecorded + manualTransactionsCreated;

  return {
    totalEvents: events.length,
    siteViews,
    siteVisitors,
    downloadVisitors,
    downloadStarts: downloadEvents.length,
    downloadConversionRate: ratio(downloadVisitors, siteVisitors),
    downloadToActiveRate: ratio(activeUsers, downloadVisitors),
    activeUsers,
    activatedUsers,
    activationRate: ratio(activatedUsers, activeUsers),
    appOpens: activeUserEvents.length,
    appOpensPerActiveUser: ratio(activeUserEvents.length, activeUsers),
    averageActiveDaysPerUser: ratio(activeDayTotal, activeUsers),
    averageSessionSeconds:
      sessionDurations.length > 0
        ? sessionDurations.reduce((total, duration) => total + duration, 0) /
          sessionDurations.length /
          1000
        : null,
    d1Retention: retention(activeDatesByUser, 1, reportEnd),
    d7Retention: retention(activeDatesByUser, 7, reportEnd),
    voiceStarted: voiceStartedEvents.length,
    voiceCompleted: voiceCompletedEvents.length,
    voiceSaved: voiceSavedEvents.length,
    voiceUndone: events.filter((event) => event.name === 'voice_undone').length,
    voiceCancelled: events.filter((event) => event.name === 'voice_cancelled').length,
    voiceFailed: voiceFailedEvents.length,
    voiceCompletionRate: ratio(voiceCompletedEvents.length, voiceStartedEvents.length),
    voiceSaveRate: ratio(voiceSavedEvents.length, voiceCompletedEvents.length),
    voiceEntriesRecorded,
    voiceLatencyP50Ms: percentile(voiceDurations, 0.5),
    voiceLatencyP95Ms: percentile(voiceDurations, 0.95),
    manualEntryOpened: events.filter((event) => event.name === 'manual_entry_opened').length,
    manualTransactionsCreated,
    statsOpened: events.filter((event) => event.name === 'stats_opened').length,
    categoriesOpened: events.filter((event) => event.name === 'categories_opened').length,
    totalEntriesCreated,
    averageEntriesPerActiveUser: ratio(totalEntriesCreated, activeUsers),
    featureUsers: {
      voice: uniqueCount(voiceSavedEvents.map((event) => event.installationHash)),
      manual: uniqueCount(
        events
          .filter((event) => event.name === 'manual_transaction_created')
          .map((event) => event.installationHash),
      ),
      stats: uniqueCount(
        events
          .filter((event) => event.name === 'stats_opened')
          .map((event) => event.installationHash),
      ),
      categories: uniqueCount(
        events
          .filter((event) => event.name === 'categories_opened')
          .map((event) => event.installationHash),
      ),
    },
    platforms: breakdown(events, 'platform'),
    appVersions: breakdown(events, 'appVersion'),
    failureReasons: [...failureReasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count),
    daily: [...daily.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, item]) => ({
        date,
        siteVisitors: item.siteHashes.size,
        activeUsers: item.activeHashes.size,
        appOpens: item.appOpens,
        downloadVisitors: item.downloadHashes.size,
        voiceStarted: item.voiceStarted,
        voiceSaved: item.voiceSaved,
        voiceFailed: item.voiceFailed,
        recordedEntries: item.recordedEntries,
      })),
  };
}
