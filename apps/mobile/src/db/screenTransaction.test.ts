import { describe, expect, it } from 'vitest';

import {
  buildScreenTransactionRecord,
  saveScreenTransaction,
  type ScreenTransactionPersistence,
} from './screenTransaction';

const input = {
  captureId: 'capture-1',
  type: 'expense' as const,
  amountMinor: 2600,
  categoryId: 'expense-transport',
  subcategoryId: 'expense-transport-taxi',
  occurredAt: '2026-11-12T10:00:00.000Z',
  note: '  滴滴出行  ',
};

describe('screen transaction repository rules', () => {
  it('builds a screen-sourced record with trimmed content', () => {
    const record = buildScreenTransactionRecord(input, '2026-11-12T10:00:05.000Z');

    expect(record).toMatchObject({
      id: 'capture-1',
      source: 'screen',
      amountMinor: 2600,
      note: '滴滴出行',
    });
  });

  it('reuses the same capture id without inserting a duplicate', () => {
    const records = new Map<string, ReturnType<typeof buildScreenTransactionRecord>>();
    let backupUpdates = 0;
    const persistence: ScreenTransactionPersistence = {
      findById(id) {
        return records.get(id) ?? null;
      },
      insert(record) {
        records.set(record.id, record);
      },
      markBackupPending() {
        backupUpdates += 1;
      },
    };
    const record = buildScreenTransactionRecord(input, '2026-11-12T10:00:05.000Z');

    expect(saveScreenTransaction(persistence, record)).toBe('capture-1');
    expect(saveScreenTransaction(persistence, record)).toBe('capture-1');
    expect(records).toHaveLength(1);
    expect(backupUpdates).toBe(1);
  });
});
