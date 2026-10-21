import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  AnalyticsEventStore,
  readAnalyticsEvents,
} from './event-store.js';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('AnalyticsEventStore', () => {
  it('stores events with a salted installation hash but no raw anonymous id', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-analytics-'));
    directories.push(directory);
    const store = new AnalyticsEventStore({
      directory,
      hashSalt: 'test-only-salted-value',
    });

    await store.record('anonymous-installation-id', [
      {
        name: 'voice_saved',
        occurredAt: '2026-10-21T03:00:00.000Z',
        properties: { entryCount: 2, platform: 'android', appVersion: '0.1.0' },
      },
    ]);

    const events = await readAnalyticsEvents(directory);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'voice_saved',
      properties: { entryCount: 2 },
    });
    expect(events[0]?.installationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(events)).not.toContain('anonymous-installation-id');
    await expect(
      readAnalyticsEvents(directory, { fromDate: '2999-01-01', toDate: '2999-01-01' }),
    ).resolves.toEqual([]);
  });
});
