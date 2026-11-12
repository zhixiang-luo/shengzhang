import type { TransactionType } from '@shengzhang/domain';

export interface ScreenTransactionInput {
  captureId: string;
  type: TransactionType;
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
  occurredAt: string;
  note: string;
}

export interface ScreenTransactionRecord {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: 'CNY';
  categoryId: string;
  subcategoryId: string | null;
  occurredAt: string;
  note: string;
  source: 'screen';
  voiceBatchId: null;
  voiceEntryIndex: null;
  createdAt: string;
  updatedAt: string;
  deletedAt: null;
}

export interface ScreenTransactionPersistence {
  findById(id: string): ScreenTransactionRecord | null;
  insert(record: ScreenTransactionRecord): void;
  markBackupPending(): void;
}

export function buildScreenTransactionRecord(
  input: ScreenTransactionInput,
  now: string,
): ScreenTransactionRecord {
  if (!input.captureId.trim()) throw new Error('屏幕识别草稿缺少标识');
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('金额必须大于 0');
  }
  return {
    id: input.captureId,
    type: input.type,
    amountMinor: input.amountMinor,
    currency: 'CNY',
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    occurredAt: input.occurredAt,
    note: input.note.trim(),
    source: 'screen',
    voiceBatchId: null,
    voiceEntryIndex: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function saveScreenTransaction(
  persistence: ScreenTransactionPersistence,
  record: ScreenTransactionRecord,
): string {
  if (persistence.findById(record.id)) return record.id;
  persistence.insert(record);
  persistence.markBackupPending();
  return record.id;
}
