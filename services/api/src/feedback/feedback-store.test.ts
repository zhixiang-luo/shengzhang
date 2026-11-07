import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  FeedbackStore,
  pruneFeedback,
  readFeedback,
} from './feedback-store.js';

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function input(clientFeedbackId = '6fd41cf0-83d7-4d5b-a6ab-d9c87322ed14') {
  return {
    clientFeedbackId,
    installationId: 'anonymous-installation-id',
    type: 'feature' as const,
    message: '希望增加按周查看账单的功能',
    contact: null,
    diagnostics: {
      appVersion: '0.2.1',
      platform: 'android' as const,
      osVersion: '15',
      locale: 'zh-CN',
      currentRoute: 'feedback',
    },
  };
}

describe('FeedbackStore', () => {
  it('stores a salted installation hash and returns the first record for duplicate submits', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-feedback-store-'));
    directories.push(directory);
    const store = new FeedbackStore({
      directory,
      hashSalt: 'test-only-feedback-salt',
      now: () => new Date('2026-11-07T14:30:00.000Z'),
    });

    const first = await store.record(input());
    const duplicate = await store.record(input());
    const stored = await readFeedback(directory);

    expect(duplicate).toEqual(first);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.installationHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain('anonymous-installation-id');
    expect(stored[0]).toMatchObject({
      type: 'feature',
      message: '希望增加按周查看账单的功能',
      receivedAt: '2026-11-07T14:30:00.000Z',
    });
  });

  it('returns the first record when the same submission is retried after midnight', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-feedback-retry-'));
    directories.push(directory);
    let now = new Date('2026-11-07T15:59:59.000Z');
    const store = new FeedbackStore({
      directory,
      hashSalt: 'test-only-feedback-salt',
      now: () => now,
    });

    const first = await store.record(input());
    now = new Date('2026-11-07T16:00:01.000Z');
    const duplicate = await store.record(input());
    const stored = await readFeedback(directory);

    expect(duplicate).toEqual(first);
    expect(stored).toHaveLength(1);
  });

  it('prunes feedback directories older than the retention cutoff', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-feedback-prune-'));
    directories.push(directory);
    const oldStore = new FeedbackStore({
      directory,
      hashSalt: 'test-only-feedback-salt',
      now: () => new Date('2026-01-01T02:00:00.000Z'),
    });
    const recentStore = new FeedbackStore({
      directory,
      hashSalt: 'test-only-feedback-salt',
      now: () => new Date('2026-11-07T02:00:00.000Z'),
    });
    await oldStore.record(input('c0fda61f-0e37-4f0a-b2a3-804409bd3c0b'));
    await recentStore.record(input('ec85cf6a-8ea8-44c8-8a73-d9ca75adb932'));

    await expect(pruneFeedback(directory, '2026-06-01')).resolves.toBe(1);
    await expect(readFeedback(directory, { date: '2026-01-01' })).resolves.toEqual([]);
    await expect(readFeedback(directory, { date: '2026-11-07' })).resolves.toHaveLength(1);
  });
});
