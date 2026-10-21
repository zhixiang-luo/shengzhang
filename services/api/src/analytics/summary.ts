import type { StoredAnalyticsEvent } from './event-store.js';

export type DailyAnalyticsSummary = {
  date: string;
  activeUsers: number;
  appOpens: number;
  downloadVisitors: number;
  voiceSaved: number;
  recordedEntries: number;
};

export type AnalyticsSummary = {
  totalEvents: number;
  siteVisitors: number;
  downloadVisitors: number;
  downloadStarts: number;
  downloadConversionRate: number | null;
  activeUsers: number;
  appOpens: number;
  appOpensPerActiveUser: number | null;
  voiceStarted: number;
  voiceCompleted: number;
  voiceSaved: number;
  voiceUndone: number;
  voiceCancelled: number;
  voiceFailed: number;
  voiceEntriesRecorded: number;
  manualEntryOpened: number;
  manualTransactionsCreated: number;
  statsOpened: number;
  categoriesOpened: number;
  totalEntriesCreated: number;
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

export function summarizeAnalytics(events: StoredAnalyticsEvent[]): AnalyticsSummary {
  const siteVisitors = uniqueCount(
    events.filter((event) => event.name === 'site_viewed').map((event) => event.installationHash),
  );
  const downloadEvents = events.filter((event) => event.name === 'download_started');
  const downloadVisitors = uniqueCount(downloadEvents.map((event) => event.installationHash));
  const activeUserEvents = events.filter((event) => event.name === 'app_opened');
  const activeUsers = uniqueCount(activeUserEvents.map((event) => event.installationHash));
  const voiceSavedEvents = events.filter((event) => event.name === 'voice_saved');
  const voiceEntriesRecorded = voiceSavedEvents.reduce(
    (total, event) => total + (event.properties.entryCount ?? 0),
    0,
  );
  const manualTransactionsCreated = events.filter(
    (event) => event.name === 'manual_transaction_created',
  ).length;
  const daily = new Map<
    string,
    {
      activeHashes: Set<string>;
      downloadHashes: Set<string>;
      appOpens: number;
      voiceSaved: number;
      recordedEntries: number;
    }
  >();

  for (const event of events) {
    const date = eventDate(event);
    const entry = daily.get(date) ?? {
      activeHashes: new Set<string>(),
      downloadHashes: new Set<string>(),
      appOpens: 0,
      voiceSaved: 0,
      recordedEntries: 0,
    };
    if (event.name === 'app_opened') {
      entry.activeHashes.add(event.installationHash);
      entry.appOpens += 1;
    }
    if (event.name === 'download_started') entry.downloadHashes.add(event.installationHash);
    if (event.name === 'voice_saved') {
      entry.voiceSaved += 1;
      entry.recordedEntries += event.properties.entryCount ?? 0;
    }
    daily.set(date, entry);
  }

  return {
    totalEvents: events.length,
    siteVisitors,
    downloadVisitors,
    downloadStarts: downloadEvents.length,
    downloadConversionRate: ratio(downloadVisitors, siteVisitors),
    activeUsers,
    appOpens: activeUserEvents.length,
    appOpensPerActiveUser: ratio(activeUserEvents.length, activeUsers),
    voiceStarted: events.filter((event) => event.name === 'voice_started').length,
    voiceCompleted: events.filter((event) => event.name === 'voice_completed').length,
    voiceSaved: voiceSavedEvents.length,
    voiceUndone: events.filter((event) => event.name === 'voice_undone').length,
    voiceCancelled: events.filter((event) => event.name === 'voice_cancelled').length,
    voiceFailed: events.filter((event) => event.name === 'voice_failed').length,
    voiceEntriesRecorded,
    manualEntryOpened: events.filter((event) => event.name === 'manual_entry_opened').length,
    manualTransactionsCreated,
    statsOpened: events.filter((event) => event.name === 'stats_opened').length,
    categoriesOpened: events.filter((event) => event.name === 'categories_opened').length,
    totalEntriesCreated: voiceEntriesRecorded + manualTransactionsCreated,
    daily: [...daily.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, item]) => ({
        date,
        activeUsers: item.activeHashes.size,
        appOpens: item.appOpens,
        downloadVisitors: item.downloadHashes.size,
        voiceSaved: item.voiceSaved,
        recordedEntries: item.recordedEntries,
      })),
  };
}
