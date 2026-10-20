import type { Environment } from '../config.js';
import { CloudVoiceProvider } from './cloud-voice-provider.js';
import { DeepSeekStructuredParser } from './deepseek-llm.js';
import { MockVoiceProvider } from './mock-voice-provider.js';
import { SiliconFlowAsrProvider } from './siliconflow-asr.js';
import type { VoiceProvider } from './voice.js';

export function createVoiceProvider(environment: Environment): VoiceProvider {
  if (environment.VOICE_PROVIDER === 'mock') return new MockVoiceProvider();

  if (!environment.SILICONFLOW_API_KEY || !environment.DEEPSEEK_API_KEY) {
    throw new Error('Cloud voice provider requires SILICONFLOW_API_KEY and DEEPSEEK_API_KEY');
  }

  return new CloudVoiceProvider(
    new SiliconFlowAsrProvider(
      environment.SILICONFLOW_API_KEY,
      environment.SILICONFLOW_BASE_URL,
      environment.SILICONFLOW_ASR_MODEL,
    ),
    new DeepSeekStructuredParser(
      environment.DEEPSEEK_API_KEY,
      environment.DEEPSEEK_BASE_URL,
      environment.DEEPSEEK_MODEL,
    ),
  );
}
