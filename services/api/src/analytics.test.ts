import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readAnalyticsEvents } from './analytics/event-store.js';
import { buildApp } from './app.js';

const directories: string[] = [];
const originalDirectory = process.env.ANALYTICS_DATA_DIR;
const originalSalt = process.env.ANALYTICS_HASH_SALT;

afterEach(async () => {
  if (originalDirectory === undefined) delete process.env.ANALYTICS_DATA_DIR;
  else process.env.ANALYTICS_DATA_DIR = originalDirectory;
  if (originalSalt === undefined) delete process.env.ANALYTICS_HASH_SALT;
  else process.env.ANALYTICS_HASH_SALT = originalSalt;
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('analytics API', () => {
  it('accepts a minimal event and stores no raw installation id', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-analytics-api-'));
    directories.push(directory);
    process.env.ANALYTICS_DATA_DIR = directory;
    process.env.ANALYTICS_HASH_SALT = 'test-only-analytics-salt';
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/analytics/events',
      payload: {
        anonymousId: 'anonymous-installation-id',
        events: [
          {
            name: 'app_opened',
            occurredAt: new Date().toISOString(),
            properties: { platform: 'android', appVersion: '0.1.0' },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(202);
    const events = await readAnalyticsEvents(directory);
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain('anonymous-installation-id');
    await app.close();
  });
});
