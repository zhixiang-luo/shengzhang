import type { ResolvedVoiceEntry } from '@shengzhang/domain';

export interface SavedVoiceEntry {
  entry: ResolvedVoiceEntry;
  transactionId: string;
}

export function attachSavedVoiceTransactionIds(
  entries: ResolvedVoiceEntry[],
  transactionIds: string[],
): SavedVoiceEntry[] {
  if (entries.length !== transactionIds.length) {
    throw new Error('语音结果与已保存账单数量不一致');
  }
  return entries.map((entry, index) => ({
    entry,
    transactionId: transactionIds[index],
  }));
}
