import {
  buildMonthlyReview,
  type MonthlyReview,
  type MonthlyReviewTransaction,
} from '@shengzhang/domain';
import { useCallback, useMemo, useRef, useState } from 'react';

import { listCategories, type CategoryRow } from '../../db/categoryRepository';
import { withFreshDatabase } from '../../db/freshDatabase';
import { useDatabaseRefresh } from '../../db/useDatabaseRefresh';
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
  const month = useMemo(() => monthDateFromKey(monthKey), [monthKey]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
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
        previousTransactions: listTransactionsBetween(
          fresh,
          previousRange.startIso,
          previousRange.endIso,
        ),
        categories: listCategories(fresh, true),
      };
    })
      .then((snapshot) => {
        if (request !== requestRef.current) return;
        setTransactions(snapshot.transactions);
        setPreviousTransactions(snapshot.previousTransactions);
        setCategories(snapshot.categories);
        setError(null);
      })
      .catch((caught) => {
        if (request !== requestRef.current) return;
        setError(caught instanceof Error ? caught.message : '月度回顾读取失败');
      })
      .finally(() => {
        if (request === requestRef.current) setLoading(false);
      });
  }, [month]);

  useDatabaseRefresh(load);

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
