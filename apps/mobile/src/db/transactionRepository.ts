import { randomUUID } from 'expo-crypto';
import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';

import { backupState, transactions } from './schema';
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
