import { describe, expect, it } from 'vitest';

import { summarizeAmounts, summarizeExpenseCategories } from './ledger';

describe('ledger summaries', () => {
  const transactions = [
    { type: 'expense' as const, amountMinor: 2500, categoryId: 'food' },
    { type: 'expense' as const, amountMinor: 1800, categoryId: 'transport' },
    { type: 'expense' as const, amountMinor: 1200, categoryId: 'food' },
    { type: 'income' as const, amountMinor: 800000, categoryId: 'salary' },
  ];

  it('summarizes expense, income and balance', () => {
    expect(summarizeAmounts(transactions)).toEqual({
      expenseMinor: 5500,
      incomeMinor: 800000,
      balanceMinor: 794500,
    });
  });

  it('shows an expense-only draft total as a negative balance', () => {
    expect(
      summarizeAmounts([
        { type: 'expense', amountMinor: 2600 },
        { type: 'expense', amountMinor: 17400 },
      ]),
    ).toEqual({
      expenseMinor: 20000,
      incomeMinor: 0,
      balanceMinor: -20000,
    });
  });

  it('summarizes expenses by category in descending order', () => {
    expect(summarizeExpenseCategories(transactions)).toEqual([
      { categoryId: 'food', amountMinor: 3700, count: 2 },
      { categoryId: 'transport', amountMinor: 1800, count: 1 },
    ]);
  });

  it('rejects invalid amounts', () => {
    expect(() => summarizeAmounts([{ type: 'expense', amountMinor: 0 }])).toThrow();
  });
});
