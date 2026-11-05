import {
  buildMonthlyReview,
  type MonthlyReview,
  type MonthlyReviewTransaction,
} from '@shengzhang/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { listCategories, type CategoryRow } from '../../db/categoryRepository';
import { useDatabase } from '../../db/DatabaseProvider';
import {
  listTransactionsBetween,
  type TransactionRow,
} from '../../db/transactionRepository';
import {
  localDateKey,
  monthRange,
  shiftMonth,
} from '../../utils/date';

export function monthDateFromKey(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error('月份格式不正确');
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error('月份格式不正确');
  return new Date(year, monthNumber - 1, 1, 12);
}

export function currentMonthKey(): string {
  return localDateKey(new Date()).slice(0, 7);
}

export function monthKeyFromDate(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

function reviewTransactions(
  transactions: TransactionRow[],
  categoryMap: ReadonlyMap<string, CategoryRow>,
): MonthlyReviewTransaction[] {
  return transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    amountMinor: transaction.amountMinor,
    categoryId: transaction.categoryId,
    categoryName: categoryMap.get(transaction.categoryId)?.name ?? '其他',
    localDate: localDateKey(transaction.occurredAt),
    source: transaction.source,
  }));
}

export function useMonthlyReview(monthKey: string) {
  const db = useDatabase();
  const month = useMemo(() => monthDateFromKey(monthKey), [monthKey]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    try {
      const range = monthRange(month);
      const previousRange = monthRange(shiftMonth(month, -1));
      setTransactions(listTransactionsBetween(db, range.startIso, range.endIso));
      setPreviousTransactions(
        listTransactionsBetween(db, previousRange.startIso, previousRange.endIso),
      );
      setCategories(listCategories(db, true));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '月度回顾读取失败');
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const review = useMemo<MonthlyReview>(() => {
    try {
      return buildMonthlyReview({
        month: monthKey,
        todayDate: localDateKey(new Date()),
        transactions: reviewTransactions(transactions, categoryMap),
        previousTransactions: reviewTransactions(previousTransactions, categoryMap),
      });
    } catch (caught) {
      throw new Error(caught instanceof Error ? caught.message : '月度回顾生成失败');
    }
  }, [categoryMap, monthKey, previousTransactions, transactions]);

  return {
    month,
    review,
    categories,
    loading,
    error,
    refresh: load,
  };
}
