import { describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

describe('API foundation', () => {
  it('exposes a health endpoint', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'shengzhang-api' });
    await app.close();
  });

  it('limits repeated voice requests from one IP', async () => {
    const app = buildApp();

    for (let index = 0; index < 30; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/voice/parse-transcript',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/v1/voice/parse-transcript',
      payload: {},
    });

    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(limited.json()).toMatchObject({
      error: { code: 'VOICE_TRAFFIC_LIMITED' },
    });
    await app.close();
  });
});
