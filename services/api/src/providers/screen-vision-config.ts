import type { Environment } from '../config.js';

export type ScreenVisionThinking = 'qwen' | 'deepseek' | 'none';

type VisionEnvironment = Pick<
  Environment,
  | 'SCREEN_VISION_BASE_URL'
  | 'SCREEN_VISION_API_KEY'
  | 'DASHSCOPE_API_KEY'
  | 'SILICONFLOW_BASE_URL'
  | 'SILICONFLOW_API_KEY'
  | 'DEEPSEEK_API_KEY'
>;

export function resolveScreenVisionCredentials(environment: VisionEnvironment): {
  apiKey: string | undefined;
  thinking: ScreenVisionThinking;
} {
  const baseUrl = environment.SCREEN_VISION_BASE_URL.replace(/\/$/, '');
  const official = [
    'https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ].includes(baseUrl);
  const siliconflow = baseUrl === environment.SILICONFLOW_BASE_URL.replace(/\/$/, '');
  const deepseek = ['https://api.deepseek.com', 'https://api.deepseek.com/v1'].includes(baseUrl);
  const supplierKey = official ? environment.DASHSCOPE_API_KEY
    : siliconflow ? environment.SILICONFLOW_API_KEY
      : deepseek ? environment.DEEPSEEK_API_KEY : undefined;
  return {
    apiKey: environment.SCREEN_VISION_API_KEY || supplierKey,
    thinking: official ? 'qwen' : deepseek ? 'deepseek' : 'none',
  };
}
