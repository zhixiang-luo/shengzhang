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
});
