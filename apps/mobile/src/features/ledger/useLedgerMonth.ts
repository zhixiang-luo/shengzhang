import {
  summarizeAmounts,
  summarizeExpenseCategories,
  type AmountSummary,
} from '@shengzhang/domain';
import { useCallback, useMemo, useRef, useState } from 'react';

import { listCategories, type CategoryRow } from '../../db/categoryRepository';
import { withFreshDatabase } from '../../db/freshDatabase';
import { listTransactionsBetween, type TransactionRow } from '../../db/transactionRepository';
import { useDatabaseRefresh } from '../../db/useDatabaseRefresh';
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
  const [month, setMonthState] = useState(() => startOfMonth(new Date()));
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [previousSummary, setPreviousSummary] = useState<AmountSummary>({
    expenseMinor: 0,
    incomeMinor: 0,
    balanceMinor: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(() => {
    const request = ++requestRef.current;
    void withFreshDatabase((fresh) => {
      const range = monthRange(month);
      const previousRange = monthRange(shiftMonth(month, -1));
      return {
        transactions: listTransactionsBetween(fresh, range.startIso, range.endIso),
        previousSummary: summarizeAmounts(
          listTransactionsBetween(fresh, previousRange.startIso, previousRange.endIso),
        ),
        categories: listCategories(fresh),
      };
    })
      .then((snapshot) => {
        if (request !== requestRef.current) return;
        setTransactions(snapshot.transactions);
        setPreviousSummary(snapshot.previousSummary);
        setCategories(snapshot.categories);
        setError(null);
      })
      .catch((caught) => {
        if (request !== requestRef.current) return;
        setError(caught instanceof Error ? caught.message : '账本读取失败');
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [month]);

  useDatabaseRefresh(load);

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
          categoryIcon: subcategory?.icon ?? category?.icon ?? 'other',
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
    previousSummary,
    expenseCategories,
    loading,
    error,
    refresh: load,
    previousMonth,
    nextMonth,
  };
}
