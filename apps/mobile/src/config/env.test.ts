import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from './env';

describe('resolveApiBaseUrl', () => {
  it('uses the configured API URL and removes a trailing slash', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe(
      'https://api.example.com',
    );
  });

  it('defaults every build to the official HTTPS API', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('https://bigai.xin');
    expect(resolveApiBaseUrl('   ')).toBe('https://bigai.xin');
  });

  it('allows local development through an explicit environment override', () => {
    expect(resolveApiBaseUrl('http://127.0.0.1:8787')).toBe(
      'http://127.0.0.1:8787',
    );
  });
});
