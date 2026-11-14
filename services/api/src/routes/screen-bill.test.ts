import { Writable } from 'node:stream';

import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { visionBillSchema } from '@shengzhang/contracts';

import { validateVisionBill } from '../providers/screen-vision.js';
import { screenBillRoutes } from './screen-bill.js';

// An actual 1x1 PNG; tests only schema and transport limits, never a real bill.
const image = { mimeType: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDTkAAAAASUVORK5CYII=' };
const request = { captureId: 'capture-test', installationId: 'synthetic-installation', consent: true, capturedAt: '2026-11-12T05:00:00.000Z', timezone: 'Asia/Shanghai', categories: [], image };
const bill = { amountMinor: 2658, type: 'expense' as const, merchant: '示例餐厅', item: null, occurredAt: null, categoryId: null, amountEvidence: '实付 ¥26.58', blockingReason: null, amountIssue: null };

async function setup(provider = true, dailyLimit = 20) {
  const app = Fastify();
  await app.register(screenBillRoutes, {
    provider: provider ? { parse: async () => bill } : null,
    dailyLimit, globalDailyLimit: 100, minuteLimit: 20,
  });
  return app;
}

describe('screen bill HTTP boundary', () => {
  it('returns a validated single bill associated with its capture id', async () => {
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ captureId: 'capture-test', bill: { amountMinor: 2658 } });
    await app.close();
  });
  it.each([undefined, 'future'])('preserves the old strict response without a supported diagnostics capability: %s', async (capability) => {
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request, headers: capability ? { 'x-screen-bill-diagnostics': capability } : {} });
    expect(response.statusCode).toBe(200);
    // 0.3.1/0.3.2 used this strict schema, before amountIssue was added.
    expect(visionBillSchema.omit({ amountIssue: true }).safeParse(response.json().bill).success).toBe(true);
    await app.close();
  });
  it('includes diagnostics only when the client supports this response field', async () => {
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request, headers: { 'x-screen-bill-diagnostics': '1' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().bill).toHaveProperty('amountIssue', null);
    await app.close();
  });
  it('rejects uploads without the users explicit consent', async () => {
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: { ...request, consent: false } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
  it('checks actual image headers rather than trusting a claimed mime type', async () => {
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: { ...request, image: { ...image, base64: 'aGVsbG8=' } } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
  it('returns an unavailable status when cloud vision is disabled', async () => {
    const app = await setup(false);
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('SCREEN_VISION_DISABLED');
    await app.close();
  });
  it('limits each installation even if it changes the capture id', async () => {
    const app = await setup(true, 1);
    expect((await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request })).statusCode).toBe(200);
    const second = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: { ...request, captureId: 'another' } });
    expect(second.statusCode).toBe(429);
    expect(second.json().error.message).toContain('手动');
    expect(second.json().error.message).toContain('保存');
    await app.close();
  });
  it('returns a stable error without leaking provider response details', async () => {
    const app = Fastify();
    await app.register(screenBillRoutes, {
      provider: { parse: async () => { throw new Error('private-provider-body'); } },
      dailyLimit: 20, globalDailyLimit: 100, minuteLimit: 20,
    });
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request });
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('SCREEN_VISION_UNAVAILABLE');
    expect(response.body).not.toContain('private-provider-body');
    expect(response.headers['cache-control']).toBe('no-store');
    await app.close();
  });
  it('logs field-level validation diagnostics without extracted text', async () => {
    const output: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output.push(String(chunk));
        callback();
      },
    });
    const app = Fastify({ logger: { level: 'warn', stream } });
    const privateEvidence = '私密账单原文'.repeat(30);
    await app.register(screenBillRoutes, {
      provider: {
        parse: async () => {
          validateVisionBill({
            documentType: 'single', paymentStatus: 'success', transactionKind: 'expense',
            currency: 'CNY', amountText: '26.58', amountEvidence: privateEvidence,
            merchant: '示例餐厅', item: null, categoryId: null, occurredAt: null, timeEvidence: null,
          }, { capturedAt: request.capturedAt, timezone: request.timezone, categories: [] });
          return bill;
        },
      },
      dailyLimit: 20, globalDailyLimit: 100, minuteLimit: 20,
    });
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: request });
    const logs = output.join('');
    expect(response.statusCode).toBe(503);
    expect(logs).toContain('"screenVisionFailure"');
    expect(logs).toContain('"code":"too_big"');
    expect(logs).toContain('"path":["amountEvidence"]');
    expect(logs).not.toContain(privateEvidence);
    await app.close();
  });
  it('rejects images whose declared dimensions exceed the decode budget', async () => {
    const bytes = Buffer.from(image.base64, 'base64');
    bytes.writeUInt32BE(10000, 16);
    const app = await setup();
    const response = await app.inject({ method: 'POST', url: '/v1/screen-bill/parse', payload: { ...request, image: { ...image, base64: bytes.toString('base64') } } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('SCREEN_IMAGE_INVALID');
    await app.close();
  });
});
