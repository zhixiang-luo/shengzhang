import type { VoiceProvider, VoiceProviderInput } from './voice.js';

export class MockVoiceProvider implements VoiceProvider {
  async parse(_input: VoiceProviderInput): Promise<{
    transcript: string;
    entries: [
      {
        type: 'expense';
        amountMinor: number;
        categoryPath: [string, string];
        occurredAt: string;
        note: string;
      },
      {
        type: 'expense';
        amountMinor: number;
        categoryPath: [string, string];
        occurredAt: string;
        note: string;
      },
    ];
    unresolvedFields: [];
  }> {
    const now = new Date();
    return {
      transcript: '午饭 25，打车 18',
      entries: [
        {
          type: 'expense',
          amountMinor: 2500,
          categoryPath: ['餐饮', '午餐'],
          occurredAt: now.toISOString(),
          note: '午饭',
        },
        {
          type: 'expense',
          amountMinor: 1800,
          categoryPath: ['交通', '打车'],
          occurredAt: new Date(now.getTime() - 60_000).toISOString(),
          note: '打车',
        },
      ],
      unresolvedFields: [],
    };
  }
}
