import { describe, expect, it } from 'vitest';

import {
  buildMonthlyReview,
  buildPrivacySafeShareSummary,
  type MonthlyReviewTransaction,
} from './monthly-review';

const transactions: MonthlyReviewTransaction[] = [
  {
    id: 'food-1',
    type: 'expense',
    amountMinor: 2500,
    categoryId: 'expense-food',
    categoryName: '餐饮',
    localDate: '2026-10-01',
    source: 'voice',
  },
  {
    id: 'food-2',
    type: 'expense',
    amountMinor: 1500,
    categoryId: 'expense-food',
    categoryName: '餐饮',
    localDate: '2026-10-12',
    source: 'manual',
  },
  {
    id: 'transport-1',
    type: 'expense',
    amountMinor: 1000,
    categoryId: 'expense-transport',
    categoryName: '交通',
    localDate: '2026-10-12',
    source: 'voice',
  },
  {
    id: 'salary-1',
    type: 'income',
    amountMinor: 800000,
    categoryId: 'income-salary',
    categoryName: '工资',
    localDate: '2026-10-01',
    source: 'manual',
  },
];

describe('buildMonthlyReview', () => {
  it('builds deterministic totals and contextual facts', () => {
    const review = buildMonthlyReview({
      month: '2026-10',
      todayDate: '2026-11-05',
      transactions,
      previousTransactions: [
        {
          ...transactions[0]!,
          id: 'previous-food',
          amountMinor: 4000,
          localDate: '2026-09-10',
        },
      ],
    });

    expect(review).toMatchObject({
      month: '2026-10',
      hasData: true,
      expenseMinor: 5000,
      incomeMinor: 800000,
      balanceMinor: 795000,
      transactionCount: 4,
      expenseCount: 3,
      incomeCount: 1,
      voiceTransactionCount: 2,
      dailyAverageMinor: 161,
      topCategory: {
        categoryId: 'expense-food',
        name: '餐饮',
        amountMinor: 4000,
        sharePercent: 80,
      },
      highestExpenseDay: {
        localDate: '2026-10-12',
        amountMinor: 2500,
      },
      comparison: {
        direction: 'up',
        percent: 25,
        previousExpenseMinor: 4000,
      },
    });
    expect(review.narrative).toContain('餐饮');
    expect(review.narrative).toContain('10月12日');
    expect(review.narrative).toContain('2 笔来自语音');
  });

  it('uses elapsed days for the current month and full days for past months', () => {
    const currentMonth = buildMonthlyReview({
      month: '2026-11',
      todayDate: '2026-11-05',
      transactions: [
        {
          ...transactions[0]!,
          id: 'november-food',
          amountMinor: 5000,
          localDate: '2026-11-03',
        },
      ],
    });
    const pastMonth = buildMonthlyReview({
      month: '2026-10',
      todayDate: '2026-11-05',
      transactions: [transactions[0]!],
    });

    expect(currentMonth.dailyAverageMinor).toBe(1000);
    expect(pastMonth.dailyAverageMinor).toBe(81);
  });

  it('returns an empty review without fabricated insights', () => {
    const review = buildMonthlyReview({
      month: '2026-09',
      todayDate: '2026-11-05',
      transactions: [],
      previousTransactions: [],
    });

    expect(review).toMatchObject({
      month: '2026-09',
      hasData: false,
      expenseMinor: 0,
      incomeMinor: 0,
      transactionCount: 0,
      topCategory: null,
      highestExpenseDay: null,
      comparison: {
        direction: 'no_baseline',
        percent: null,
        previousExpenseMinor: 0,
      },
    });
    expect(review.narrative).toBe('这个月还没有账单。');
  });

  it('rejects invalid months, dates and amounts', () => {
    expect(() =>
      buildMonthlyReview({ month: '2026-13', transactions: [] }),
    ).toThrow('月份格式不正确');
    expect(() =>
      buildMonthlyReview({
        month: '2026-10',
        transactions: [{ ...transactions[0]!, localDate: '2026-11-01' }],
      }),
    ).toThrow('账单日期不在回顾月份内');
    expect(() =>
      buildMonthlyReview({
        month: '2026-10',
        transactions: [{ ...transactions[0]!, amountMinor: 0 }],
      }),
    ).toThrow('金额必须大于 0');
  });
});

describe('buildPrivacySafeShareSummary', () => {
  it('exposes only banded and non-financial facts by default', () => {
    const review = buildMonthlyReview({
      month: '2026-10',
      todayDate: '2026-11-05',
      transactions,
      previousTransactions: [
        { ...transactions[0]!, id: 'previous', amountMinor: 4000 },
      ],
    });
    const share = buildPrivacySafeShareSummary(review);

    expect(share).toEqual({
      month: '2026-10',
      headline: '这个月，我说一句就记下了 4 笔。',
      topCategoryShareBand: '75%–100%',
      trend: 'up',
      trendLabel: '支出比上月多一些',
      voiceTransactionCount: 2,
      cta: '我也来记一句',
    });
    const serialized = JSON.stringify(share);
    expect(serialized).not.toContain('5000');
    expect(serialized).not.toContain('800000');
    expect(serialized).not.toContain('餐饮');
    expect(serialized).not.toContain('2026-10-12');
  });

  it('does not expose exact shares at range boundaries', () => {
    const share = buildPrivacySafeShareSummary(
      buildMonthlyReview({
        month: '2026-10',
        todayDate: '2026-11-05',
        transactions: [
          {
            ...transactions[0]!,
            amountMinor: 2500,
            localDate: '2026-10-01',
          },
        ],
      }),
    );

    expect(share.topCategoryShareBand).toBe('75%–100%');
  });
});
