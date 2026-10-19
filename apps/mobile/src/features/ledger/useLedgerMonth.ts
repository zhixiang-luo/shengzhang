import { summarizeAmounts, summarizeExpenseCategories } from '@shengzhang/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { listCategories, type CategoryRow } from '../../db/categoryRepository';
import { useDatabase } from '../../db/DatabaseProvider';
import { listTransactionsBetween, type TransactionRow } from '../../db/transactionRepository';
import { localDateKey, monthRange, shiftMonth, startOfMonth } from '../../utils/date';

export interface LedgerEntryView extends TransactionRow {
  categoryName: string;
  subcategoryName: string | null;
  categoryColor: string;
  categoryIcon: string;
}

export interface LedgerDayGroup {
  key: string;
  occurredAt: string;
  transactions: LedgerEntryView[];
}

export function useLedgerMonth() {
  const db = useDatabase();
  const [month, setMonthState] = useState(() => startOfMonth(new Date()));
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    try {
      const range = monthRange(month);
      setTransactions(listTransactionsBetween(db, range.startIso, range.endIso));
      setCategories(listCategories(db));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '账本读取失败');
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const entries = useMemo<LedgerEntryView[]>(
    () =>
      transactions.map((transaction) => {
        const category = categoryMap.get(transaction.categoryId);
        const subcategory = transaction.subcategoryId ? categoryMap.get(transaction.subcategoryId) : null;
        return {
          ...transaction,
          categoryName: category?.name ?? '其他',
          subcategoryName: subcategory?.name ?? null,
          categoryColor: category?.color ?? '#A39A91',
          categoryIcon: category?.icon ?? 'other',
        };
      }),
    [categoryMap, transactions],
  );

  const groups = useMemo<LedgerDayGroup[]>(() => {
    const grouped = new Map<string, LedgerEntryView[]>();
    for (const entry of entries) {
      const key = localDateKey(entry.occurredAt);
      const current = grouped.get(key) ?? [];
      current.push(entry);
      grouped.set(key, current);
    }
    return [...grouped.entries()].map(([key, groupEntries]) => ({
      key,
      occurredAt: groupEntries[0]?.occurredAt ?? new Date().toISOString(),
      transactions: groupEntries,
    }));
  }, [entries]);

  const summary = useMemo(() => summarizeAmounts(entries), [entries]);
  const expenseCategories = useMemo(() => summarizeExpenseCategories(entries), [entries]);

  const setMonth = useCallback((next: Date) => {
    setLoading(true);
    setMonthState(startOfMonth(next));
  }, []);

  const previousMonth = useCallback(() => setMonth(shiftMonth(month, -1)), [month, setMonth]);
  const nextMonth = useCallback(() => setMonth(shiftMonth(month, 1)), [month, setMonth]);

  return {
    month,
    categories,
    entries,
    groups,
    summary,
    expenseCategories,
    loading,
    error,
    refresh: load,
    previousMonth,
    nextMonth,
  };
}
