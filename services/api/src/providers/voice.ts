export interface VoiceProviderInput {
  audio: Buffer;
  mimeType: string;
  timezone: string;
  categories: VoiceCategory[];
}

export interface VoiceCategory {
  name: string;
  type: 'expense' | 'income';
  children: string[];
}

export interface VoiceProviderEntry {
  type?: 'expense' | 'income' | undefined;
  amountMinor?: number | undefined;
  categoryPath?: [string] | [string, string] | undefined;
  occurredAt?: string | undefined;
  note?: string | undefined;
}

export interface VoiceProviderOutput {
  transcript: string;
  entries: VoiceProviderEntry[];
  unresolvedFields: string[];
}

export interface VoiceProvider {
  parse(input: VoiceProviderInput): Promise<VoiceProviderOutput>;
}
