import { describe, expect, it } from 'vitest';

import { resolveScreenVisionCredentials } from './screen-vision-config.js';

describe('screen vision supplier credentials', () => {
  const deepseekFixture = 'fixture-ds-credential';
  const environment = {
    SCREEN_VISION_BASE_URL: 'https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1',
    SCREEN_VISION_API_KEY: undefined as string | undefined,
    DASHSCOPE_API_KEY: 'qwen-test-key',
    SILICONFLOW_BASE_URL: 'https://api.siliconflow.cn/v1',
    SILICONFLOW_API_KEY: 'silicon-test-key',
    DEEPSEEK_API_KEY: deepseekFixture,
  };
  it('uses the official key and non-thinking mode for the official Qwen endpoint', () => {
    expect(resolveScreenVisionCredentials(environment)).toEqual({ apiKey: 'qwen-test-key', thinking: 'qwen' });
  });
  it('does not send either supplier key to a custom proxy', () => {
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://other.example/v1' }))
      .toEqual({ apiKey: undefined, thinking: 'none' });
  });
  it('does not treat an official-looking suffix as an official origin', () => {
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://cn-beijing.maas.qianwenaiapi.com.other.example/v1' }))
      .toEqual({ apiKey: undefined, thinking: 'none' });
  });
  it('keeps the explicitly configured SiliconFlow service working with its own key', () => {
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://api.siliconflow.cn/v1/' }))
      .toEqual({ apiKey: 'silicon-test-key', thinking: 'none' });
  });
  it('uses the DeepSeek key and DeepSeek non-thinking mode for the official DeepSeek endpoint', () => {
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://api.deepseek.com' }))
      .toEqual({ apiKey: deepseekFixture, thinking: 'deepseek' });
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://api.deepseek.com/v1' }))
      .toEqual({ apiKey: deepseekFixture, thinking: 'deepseek' });
  });
  it('uses a dedicated key for an explicitly configured custom endpoint', () => {
    expect(resolveScreenVisionCredentials({ ...environment, SCREEN_VISION_BASE_URL: 'https://other.example/v1', SCREEN_VISION_API_KEY: 'dedicated-fixture-key' }))
      .toEqual({ apiKey: 'dedicated-fixture-key', thinking: 'none' });
  });
});
