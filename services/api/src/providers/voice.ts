export interface VoiceProviderInput {
  audio: Buffer;
  mimeType: string;
  timezone: string;
  categoryNames: string[];
}

export interface VoiceProviderEntry {
  type: 'expense' | 'income';
  amountMinor: number;
  categoryPath: [string] | [string, string];
  occurredAt: string;
  note: string;
}

export interface VoiceProviderOutput {
  transcript: string;
  entries: VoiceProviderEntry[];
  unresolvedFields: string[];
}

export interface VoiceProvider {
  parse(input: VoiceProviderInput): Promise<VoiceProviderOutput>;
}
