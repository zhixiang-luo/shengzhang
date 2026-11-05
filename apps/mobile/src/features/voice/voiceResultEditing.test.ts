import { describe, expect, it } from 'vitest';

import { attachSavedVoiceTransactionIds } from './voiceResultEditing';

const entries = [
  {
    type: 'expense' as const,
    amountMinor: 2500,
    categoryId: 'food',
    subcategoryId: 'lunch',
    occurredAt: '2026-11-05T04:00:00.000Z',
    note: '午饭',
    categoryName: '餐饮',
    subcategoryName: '午餐',
  },
  {
    type: 'expense' as const,
    amountMinor: 1800,
    categoryId: 'transport',
    subcategoryId: null,
    occurredAt: '2026-11-05T04:00:00.000Z',
    note: '打车',
    categoryName: '交通',
    subcategoryName: null,
  },
];

describe('attachSavedVoiceTransactionIds', () => {
  it('keeps each saved transaction aligned with its result row', () => {
    expect(attachSavedVoiceTransactionIds(entries, ['tx-1', 'tx-2'])).toEqual([
      { entry: entries[0], transactionId: 'tx-1' },
      { entry: entries[1], transactionId: 'tx-2' },
    ]);
  });

  it('rejects a partial save instead of opening the wrong transaction', () => {
    expect(() => attachSavedVoiceTransactionIds(entries, ['tx-1'])).toThrow(
      '语音结果与已保存账单数量不一致',
    );
  });
});
