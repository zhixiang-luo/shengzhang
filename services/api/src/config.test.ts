import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadEnvironment } from './config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('app update environment', () => {
  it('parses release notes from a JSON string array', () => {
    vi.stubEnv(
      'APP_UPDATE_ANDROID_RELEASE_NOTES',
      '["付款页快捷记账","同一页面可以连续记多笔"]',
    );

    expect(loadEnvironment().APP_UPDATE_ANDROID_RELEASE_NOTES).toEqual([
      '付款页快捷记账',
      '同一页面可以连续记多笔',
    ]);
  });

  it('fails fast when release notes are not valid JSON', () => {
    vi.stubEnv('APP_UPDATE_ANDROID_RELEASE_NOTES', '付款页快捷记账');

    expect(() => loadEnvironment()).toThrow(/更新说明必须是 JSON 字符串数组/);
  });

  it('limits release notes to six entries', () => {
    vi.stubEnv(
      'APP_UPDATE_ANDROID_RELEASE_NOTES',
      JSON.stringify(['1', '2', '3', '4', '5', '6', '7']),
    );

    expect(() => loadEnvironment()).toThrow(/最多 6 条/);
  });
});
