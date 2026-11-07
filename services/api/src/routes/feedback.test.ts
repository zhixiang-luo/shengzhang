import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { readFeedback } from '../feedback/feedback-store.js';
import { buildApp } from '../app.js';

const directories: string[] = [];
const originalDirectory = process.env.FEEDBACK_DATA_DIR;
const originalSalt = process.env.FEEDBACK_HASH_SALT;

afterEach(async () => {
  if (originalDirectory === undefined) delete process.env.FEEDBACK_DATA_DIR;
  else process.env.FEEDBACK_DATA_DIR = originalDirectory;
  if (originalSalt === undefined) delete process.env.FEEDBACK_HASH_SALT;
  else process.env.FEEDBACK_HASH_SALT = originalSalt;
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createApp() {
  const directory = await mkdtemp(path.join(tmpdir(), 'shengzhang-feedback-api-'));
  directories.push(directory);
  process.env.FEEDBACK_DATA_DIR = directory;
  process.env.FEEDBACK_HASH_SALT = 'test-only-feedback-salt';
  return { app: buildApp(), directory };
}

function validPayload(clientFeedbackId = '6fd41cf0-83d7-4d5b-a6ab-d9c87322ed14') {
  return {
    clientFeedbackId,
    installationId: 'anonymous-installation-id',
    type: 'voice',
    message: '语音完成后，昨天的时间显示不对',
    contact: 'reader@example.com',
    diagnostics: {
      appVersion: '0.2.1',
      platform: 'android',
      osVersion: '15',
      locale: 'zh-CN',
      currentRoute: 'feedback',
      errorCode: null,
      requestId: null,
    },
  };
}

describe('feedback API', () => {
  it('accepts a valid feedback submission without storing the raw installation id', async () => {
    const { app, directory } = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: validPayload(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      referenceCode: expect.stringMatching(/^FB-\d{8}-[A-F0-9]{6}$/),
    });
    const feedback = await readFeedback(directory);
    expect(feedback).toHaveLength(1);
    expect(feedback[0]).toMatchObject({
      type: 'voice',
      message: '语音完成后，昨天的时间显示不对',
      contact: 'reader@example.com',
    });
    expect(JSON.stringify(feedback)).not.toContain('anonymous-installation-id');
    await app.close();
  });

  it('rejects unknown fields and a description shorter than ten characters', async () => {
    const { app } = await createApp();

    const unknownField = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: { ...validPayload(), amountMinor: 2500 },
    });
    expect(unknownField.statusCode).toBe(400);
    expect(unknownField.json()).toMatchObject({
      error: { code: 'INVALID_FEEDBACK' },
    });

    const shortMessage = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: { ...validPayload(), message: '不好用' },
    });
    expect(shortMessage.statusCode).toBe(400);
    expect(shortMessage.json()).toMatchObject({
      error: { code: 'INVALID_FEEDBACK' },
    });
    await app.close();
  });

  it('limits repeated feedback submissions from one IP', async () => {
    const { app } = await createApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/feedback',
        payload: validPayload(randomUUID()),
      });
      expect(response.statusCode).toBe(202);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: validPayload(randomUUID()),
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(limited.json()).toMatchObject({
      error: { code: 'FEEDBACK_RATE_LIMITED' },
    });
    await app.close();
  });

  it('rejects a request body larger than sixteen kibibytes', async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/feedback',
      payload: {
        ...validPayload(),
        oversized: 'x'.repeat(17 * 1024),
      },
    });

    expect(response.statusCode).toBe(413);
    await app.close();
  });
});
