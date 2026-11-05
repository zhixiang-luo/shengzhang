import { summarizeAmounts, summarizeExpenseCategories } from './ledger';
import type { TransactionSource, TransactionType } from './transaction';

export interface MonthlyReviewTransaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  categoryId: string;
  categoryName: string;
  localDate: string;
  source: TransactionSource;
}

export interface MonthlyReviewComparison {
  direction: 'up' | 'down' | 'same' | 'no_baseline';
  percent: number | null;
  previousExpenseMinor: number;
}

export interface MonthlyReview {
  month: string;
  hasData: boolean;
  expenseMinor: number;
  incomeMinor: number;
  balanceMinor: number;
  transactionCount: number;
  expenseCount: number;
  incomeCount: number;
  voiceTransactionCount: number;
  dailyAverageMinor: number;
  topCategory: {
    categoryId: string;
    name: string;
    amountMinor: number;
    sharePercent: number;
  } | null;
  highestExpenseDay: {
    localDate: string;
    amountMinor: number;
  } | null;
  comparison: MonthlyReviewComparison;
  narrative: string;
}

export interface PrivacySafeShareSummary {
  month: string;
  headline: string;
  topCategoryShareBand: string;
  trend: MonthlyReviewComparison['direction'];
  trendLabel: string;
  voiceTransactionCount: number;
  cta: string;
}

export interface BuildMonthlyReviewInput {
  month: string;
  transactions: ReadonlyArray<MonthlyReviewTransaction>;
  previousTransactions?: ReadonlyArray<MonthlyReviewTransaction>;
  todayDate?: string;
}

function parseLocalDate(value: string, label: string): { year: number; month: number; day: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}格式不正确`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label}格式不正确`);
  }
  return { year: year!, month: month!, day: day! };
}

function parseMonth(month: string): { year: number; month: number } {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式不正确');
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    throw new Error('月份格式不正确');
  }
  return { year, month: monthNumber };
}

function validateTransactions(transactions: ReadonlyArray<MonthlyReviewTransaction>) {
  transactions.forEach((transaction) => {
    if (!Number.isSafeInteger(transaction.amountMinor) || transaction.amountMinor <= 0) {
      throw new Error('金额必须大于 0');
    }
    parseLocalDate(transaction.localDate, '账单日期');
  });
}

function elapsedDays(month: string, todayDate: string | undefined, daysInMonth: number): number {
  if (!todayDate) return daysInMonth;
  const today = parseLocalDate(todayDate, '今天日期');
  const currentMonth = month.split('-').map(Number);
  if (today.year === currentMonth[0] && today.month === currentMonth[1]) {
    return Math.max(1, Math.min(today.day, daysInMonth));
  }
  return daysInMonth;
}

function comparisonFor(
  currentExpenseMinor: number,
  previousExpenseMinor: number,
): MonthlyReviewComparison {
  if (previousExpenseMinor === 0) {
    return {
      direction: 'no_baseline',
      percent: null,
      previousExpenseMinor,
    };
  }
  const percent = Math.round(
    ((currentExpenseMinor - previousExpenseMinor) / previousExpenseMinor) * 100,
  );
  return {
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'same',
    percent,
    previousExpenseMinor,
  };
}

function shareBand(sharePercent: number): string {
  if (sharePercent < 25) return '0%–25%';
  if (sharePercent < 50) return '25%–50%';
  if (sharePercent < 75) return '50%–75%';
  return '75%–100%';
}

function narrativeFor(
  review: Omit<MonthlyReview, 'narrative'>,
  monthNumber: number,
): string {
  if (!review.hasData) return '这个月还没有账单。';
  const sentences: string[] = [];
  if (review.topCategory) {
    sentences.push(
      `${review.topCategory.name}是本月最大的一笔去处，占支出的 ${review.topCategory.sharePercent}%。`,
    );
  }
  if (review.highestExpenseDay) {
    const day = Number(review.highestExpenseDay.localDate.slice(8, 10));
    sentences.push(`${monthNumber}月${day}日是支出最高的一天。`);
  }
  if (review.voiceTransactionCount > 0) {
    sentences.push(`有 ${review.voiceTransactionCount} 笔来自语音。`);
  }
  return sentences.join('');
}

export function buildMonthlyReview(input: BuildMonthlyReviewInput): MonthlyReview {
  const { year, month } = parseMonth(input.month);
  validateTransactions(input.transactions);
  validateTransactions(input.previousTransactions ?? []);

  for (const transaction of input.transactions) {
    if (!transaction.localDate.startsWith(`${input.month}-`)) {
      throw new Error('账单日期不在回顾月份内');
    }
  }

  const summary = summarizeAmounts(input.transactions);
  const previousSummary = summarizeAmounts(input.previousTransactions ?? []);
  const categoryAmounts = summarizeExpenseCategories(input.transactions);
  const categoryNames = new Map(
    input.transactions.map((transaction) => [transaction.categoryId, transaction.categoryName]),
  );
  const topCategoryAmount = categoryAmounts[0];
  const topCategory =
    topCategoryAmount && summary.expenseMinor > 0
      ? {
          categoryId: topCategoryAmount.categoryId,
          name: categoryNames.get(topCategoryAmount.categoryId) ?? '其他',
          amountMinor: topCategoryAmount.amountMinor,
          sharePercent: Math.round(
            (topCategoryAmount.amountMinor / summary.expenseMinor) * 100,
          ),
        }
      : null;

  const expenseByDay = new Map<string, number>();
  for (const transaction of input.transactions) {
    if (transaction.type !== 'expense') continue;
    expenseByDay.set(
      transaction.localDate,
      (expenseByDay.get(transaction.localDate) ?? 0) + transaction.amountMinor,
    );
  }
  const highestExpenseDay =
    [...expenseByDay.entries()]
      .sort(([leftDate, leftAmount], [rightDate, rightAmount]) =>
        rightAmount - leftAmount || rightDate.localeCompare(leftDate),
      )
      .map(([localDate, amountMinor]) => ({ localDate, amountMinor }))[0] ?? null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = elapsedDays(input.month, input.todayDate, daysInMonth);
  const base = {
    month: input.month,
    hasData: input.transactions.length > 0,
    expenseMinor: summary.expenseMinor,
    incomeMinor: summary.incomeMinor,
    balanceMinor: summary.balanceMinor,
    transactionCount: input.transactions.length,
    expenseCount: input.transactions.filter((transaction) => transaction.type === 'expense').length,
    incomeCount: input.transactions.filter((transaction) => transaction.type === 'income').length,
    voiceTransactionCount: input.transactions.filter(
      (transaction) => transaction.source === 'voice',
    ).length,
    dailyAverageMinor: Math.round(summary.expenseMinor / Math.max(1, days)),
    topCategory,
    highestExpenseDay,
    comparison: comparisonFor(summary.expenseMinor, previousSummary.expenseMinor),
  };

  return {
    ...base,
    narrative: narrativeFor(base, month),
  };
}

export function buildPrivacySafeShareSummary(
  review: MonthlyReview,
): PrivacySafeShareSummary {
  const trendLabel =
    review.comparison.direction === 'up'
      ? '支出比上月多一些'
      : review.comparison.direction === 'down'
        ? '支出比上月少一些'
        : review.comparison.direction === 'same'
          ? '支出和上月差不多'
          : '这个月开始有了自己的节奏';

  return {
    month: review.month,
    headline: `这个月，我说一句就记下了 ${review.transactionCount} 笔。`,
    topCategoryShareBand: shareBand(review.topCategory?.sharePercent ?? 0),
    trend: review.comparison.direction,
    trendLabel,
    voiceTransactionCount: review.voiceTransactionCount,
    cta: '我也来记一句',
  };
}
