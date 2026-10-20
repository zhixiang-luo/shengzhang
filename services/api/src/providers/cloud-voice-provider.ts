import type { AsrProvider } from './siliconflow-asr.js';
import type { StructuredParser } from './deepseek-llm.js';
import type { VoiceProvider, VoiceProviderInput } from './voice.js';

export class CloudVoiceProvider implements VoiceProvider {
  constructor(
    private readonly asr: AsrProvider,
    private readonly parser: StructuredParser,
  ) {}

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
