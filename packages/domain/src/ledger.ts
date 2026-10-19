import type { Transaction } from './transaction';

export interface AmountSummary {
  expenseMinor: number;
  incomeMinor: number;
  balanceMinor: number;
}

export interface CategoryAmountSummary {
  categoryId: string;
  amountMinor: number;
  count: number;
}

export function summarizeAmounts(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amountMinor'>>,
): AmountSummary {
  let expenseMinor = 0;
  let incomeMinor = 0;

  for (const transaction of transactions) {
    if (!Number.isSafeInteger(transaction.amountMinor) || transaction.amountMinor <= 0) {
      throw new Error('Transaction amount must be a positive integer number of cents');
    }
    if (transaction.type === 'expense') expenseMinor += transaction.amountMinor;
    else incomeMinor += transaction.amountMinor;
  }

  return {
    expenseMinor,
    incomeMinor,
    balanceMinor: incomeMinor - expenseMinor,
  };
}

export function summarizeExpenseCategories(
  transactions: ReadonlyArray<Pick<Transaction, 'type' | 'amountMinor' | 'categoryId'>>,
): CategoryAmountSummary[] {
  const totals = new Map<string, CategoryAmountSummary>();

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue;
    const current = totals.get(transaction.categoryId) ?? {
      categoryId: transaction.categoryId,
      amountMinor: 0,
      count: 0,
    };
    current.amountMinor += transaction.amountMinor;
    current.count += 1;
    totals.set(transaction.categoryId, current);
  }

  return [...totals.values()].sort((a, b) => b.amountMinor - a.amountMinor);
}
