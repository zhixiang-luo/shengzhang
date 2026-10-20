import type { VoiceProviderInput } from './voice.js';

export interface AsrProvider {
  transcribe(input: Pick<VoiceProviderInput, 'audio' | 'mimeType'>): Promise<string>;
}

export class SiliconFlowAsrProvider implements AsrProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async transcribe(input: Pick<VoiceProviderInput, 'audio' | 'mimeType'>): Promise<string> {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.audio)], { type: input.mimeType }),
      'voice.m4a',
    );
    form.append('model', this.model);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`ASR_REQUEST_FAILED_${response.status}`);
      }
      const payload = (await response.json()) as { text?: unknown };
      if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
        throw new Error('ASR_EMPTY_TRANSCRIPT');
      }
      return payload.text.trim();
    } finally {
      clearTimeout(timeout);
    }
  }
}
