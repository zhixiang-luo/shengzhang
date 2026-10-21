import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { shanghaiDateKey } from '../security/voice-quota.js';

export const ANALYTICS_EVENT_NAMES = [
  'site_viewed',
  'download_started',
  'app_opened',
  'voice_started',
  'voice_completed',
  'voice_saved',
  'voice_undone',
  'voice_cancelled',
  'voice_failed',
  'manual_entry_opened',
  'manual_transaction_created',
  'transaction_updated',
  'transaction_deleted',
  'stats_opened',
  'categories_opened',
  'settings_opened',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export type AnalyticsEventProperties = {
  platform?: 'android' | 'ios' | 'web' | undefined;
  appVersion?: string | undefined;
  entryCount?: number | undefined;
  durationMs?: number | undefined;
  reason?:
    | 'cancelled'
    | 'permission'
    | 'connection'
    | 'timeout'
    | 'empty'
    | 'too_short'
    | 'provider'
    | 'save_failed'
    | 'unknown'
    | undefined;
  source?: 'official_site' | undefined;
};

export type AnalyticsEventInput = {
  name: AnalyticsEventName;
  occurredAt: string;
  properties: AnalyticsEventProperties;
};

export type StoredAnalyticsEvent = AnalyticsEventInput & {
  receivedAt: string;
  installationHash: string;
};

type AnalyticsEventStoreOptions = {
  directory: string;
  hashSalt: string;
};

export class AnalyticsEventStore {
  private writeChain = Promise.resolve();

  constructor(private readonly options: AnalyticsEventStoreOptions) {}

  record(anonymousId: string, events: AnalyticsEventInput[]): Promise<void> {
    const receivedAt = new Date();
    const installationHash = createHash('sha256')
      .update(this.options.hashSalt)
      .update('\0')
      .update(anonymousId)
      .digest('hex');
    const records: StoredAnalyticsEvent[] = events.map((event) => ({
      ...event,
      receivedAt: receivedAt.toISOString(),
      installationHash,
    }));
    const dateKey = shanghaiDateKey(receivedAt);
    const filePath = path.join(this.options.directory, `events-${dateKey}.jsonl`);
    const payload = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;

    this.writeChain = this.writeChain.catch(() => undefined).then(async () => {
      await mkdir(this.options.directory, { recursive: true });
      await appendFile(filePath, payload, { encoding: 'utf8', mode: 0o600 });
    });
    return this.writeChain;
  }
}

export async function readAnalyticsEvents(directory: string): Promise<StoredAnalyticsEvent[]> {
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const events: StoredAnalyticsEvent[] = [];
  for (const file of files.filter((name) => /^events-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)).sort()) {
    const content = await readFile(path.join(directory, file), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StoredAnalyticsEvent;
        if (
          typeof event.installationHash === 'string' &&
          typeof event.name === 'string' &&
          typeof event.occurredAt === 'string'
        ) {
          events.push(event);
        }
      } catch {
        // A malformed local analytics line must not break reporting.
      }
    }
  }
  return events;
}
