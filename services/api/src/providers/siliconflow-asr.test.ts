import { afterEach, describe, expect, it, vi } from 'vitest';

import { SiliconFlowAsrProvider } from './siliconflow-asr.js';

describe('SiliconFlowAsrProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the transcript from the OpenAI-compatible endpoint', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ text: '午饭二十五，打车十八' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new SiliconFlowAsrProvider(
      'test-key',
      'https://api.siliconflow.cn/v1',
      'FunAudioLLM/SenseVoiceSmall',
    );

    const transcript = await provider.transcribe({
      audio: Buffer.from('audio'),
      mimeType: 'audio/m4a',
    });

    expect(transcript).toBe('午饭二十五，打车十八');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.siliconflow.cn/v1/audio/transcriptions',
      expect.anything(),
    );
  });

  it('surfaces provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    const provider = new SiliconFlowAsrProvider(
      'bad-key',
      'https://api.siliconflow.cn/v1',
      'FunAudioLLM/SenseVoiceSmall',
    );
    await expect(
      provider.transcribe({ audio: Buffer.from('audio'), mimeType: 'audio/m4a' }),
    ).rejects.toThrow('ASR_REQUEST_FAILED_401');
  });
});
