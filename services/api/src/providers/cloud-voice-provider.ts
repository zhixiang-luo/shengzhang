import type { AsrProvider } from './siliconflow-asr.js';
import type { StructuredParser } from './deepseek-llm.js';
import type { VoiceCategory, VoiceProvider, VoiceProviderInput } from './voice.js';

export class CloudVoiceProvider implements VoiceProvider {
  constructor(
    private readonly asr: AsrProvider,
    private readonly parser: StructuredParser,
  ) {}

  transcribe(input: Pick<VoiceProviderInput, 'audio' | 'mimeType'>) {
    return this.asr.transcribe(input);
  }

  async parseTranscript(input: {
    transcript: string;
    timezone: string;
    categories: VoiceCategory[];
  }) {
    const parsed = await this.parser.parse(input);
    return {
      transcript: input.transcript,
      entries: parsed.entries,
      unresolvedFields: parsed.unresolvedFields,
    };
  }

  async parse(input: VoiceProviderInput) {
    const transcript = await this.asr.transcribe(input);
    const parsed = await this.parser.parse({
      transcript,
      timezone: input.timezone,
      categories: input.categories,
    });
    return {
      transcript,
      entries: parsed.entries,
      unresolvedFields: parsed.unresolvedFields,
    };
  }
}
