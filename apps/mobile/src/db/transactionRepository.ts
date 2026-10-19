import { randomUUID } from 'expo-crypto';
import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import type { ResolvedVoiceEntry } from '@shengzhang/domain';

import { backupState, transactions, voiceBatches } from './schema';
import type { AppDatabase } from './schema-types';
import { findCategory } from './categoryRepository';

export type TransactionRow = typeof transactions.$inferSelect;

export interface TransactionInput {
  type: 'expense' | 'income';
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
  occurredAt: string;
  note: string;
}

export interface VoiceBatchInput {
  requestId: string;
  transcript: string;
  entries: ResolvedVoiceEntry[];
}

function validateCategorySelection(db: AppDatabase, input: TransactionInput) {
  const category = findCategory(db, input.categoryId);
  if (!category || category.isArchived || category.type !== input.type || category.parentId !== null) {
    throw new Error('请选择有效的账单分类');
  }

  if (input.subcategoryId) {
    const subcategory = findCategory(db, input.subcategoryId);
    if (!subcategory || subcategory.parentId !== category.id || subcategory.isArchived) {
      throw new Error('请选择有效的二级分类');
    }
  }
}

export function createTransaction(db: AppDatabase, input: TransactionInput): string {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('金额必须大于 0');
  }
  validateCategorySelection(db, input);

  const now = new Date().toISOString();
  const id = randomUUID();
  db.transaction((tx) => {
    tx.insert(transactions)
      .values({
        id,
        type: input.type,
        amountMinor: input.amountMinor,
        currency: 'CNY',
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        occurredAt: input.occurredAt,
        note: input.note.trim(),
        source: 'manual',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });
  return id;
}

export function updateTransaction(db: AppDatabase, id: string, input: TransactionInput) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('金额必须大于 0');
  }
  validateCategorySelection(db, input);
  db.transaction((tx) => {
    tx.update(transactions)
      .set({
        type: input.type,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        occurredAt: input.occurredAt,
        note: input.note.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .run();
    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });
}

export function softDeleteTransaction(db: AppDatabase, id: string) {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(transactions)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
      .run();
    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });
}

export function restoreTransaction(db: AppDatabase, id: string) {
  db.transaction((tx) => {
    tx.update(transactions)
      .set({ deletedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(transactions.id, id))
      .run();
    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });
}

export function createVoiceBatch(db: AppDatabase, input: VoiceBatchInput): string[] {
  if (input.entries.length === 0 || input.entries.length > 5) {
    throw new Error('一次语音需要生成 1–5 笔账单');
  }
  input.entries.forEach((entry) =>
    validateCategorySelection(db, {
      type: entry.type,
      amountMinor: entry.amountMinor,
      categoryId: entry.categoryId,
      subcategoryId: entry.subcategoryId,
      occurredAt: entry.occurredAt,
      note: entry.note,
    }),
  );

  const now = new Date();
  const nowIso = now.toISOString();
  const ids: string[] = [];

  db.transaction((tx) => {
    tx.insert(voiceBatches)
      .values({
        requestId: input.requestId,
        transcript: input.transcript,
        entryCount: input.entries.length,
        unresolvedFields: '[]',
        undoExpiresAt: new Date(now.getTime() + 8000).toISOString(),
        createdAt: nowIso,
      })
      .run();

    input.entries.forEach((entry, index) => {
      const id = randomUUID();
      ids.push(id);
      tx.insert(transactions)
        .values({
          id,
          type: entry.type,
          amountMinor: entry.amountMinor,
          currency: 'CNY',
          categoryId: entry.categoryId,
          subcategoryId: entry.subcategoryId,
          occurredAt: entry.occurredAt,
          note: entry.note.trim(),
          source: 'voice',
          voiceBatchId: input.requestId,
          voiceEntryIndex: index,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
    });

    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });

  return ids;
}

export function softDeleteVoiceBatch(db: AppDatabase, requestId: string) {
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(transactions)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(transactions.voiceBatchId, requestId), isNull(transactions.deletedAt)))
      .run();
    tx.update(backupState)
      .set({ status: 'pending' })
      .where(eq(backupState.id, 1))
      .run();
  });
}

export function findTransaction(db: AppDatabase, id: string): TransactionRow | null {
  return db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
    .get() ?? null;
}

export function listTransactionsBetween(
  db: AppDatabase,
  startIso: string,
  endIso: string,
): TransactionRow[] {
  return db
    .select()
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        gte(transactions.occurredAt, startIso),
        lt(transactions.occurredAt, endIso),
      ),
    )
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .all();
}

export function countTransactions(db: AppDatabase): number {
  return db.select({ id: transactions.id }).from(transactions).where(isNull(transactions.deletedAt)).all().length;
}
