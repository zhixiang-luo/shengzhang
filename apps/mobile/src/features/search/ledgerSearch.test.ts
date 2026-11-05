import { describe, expect, it } from 'vitest';

import {
  countActiveSearchFilters,
  dateFromLocalDateKey,
  matchesLedgerSearch,
  normalizeLedgerSearchFilters,
  updateSearchDate,
} from './ledgerSearch';

const categoryById = new Map([
  [
    'expense-food',
    { id: 'expense-food', name: '餐饮', parentId: null },
  ],
  [
    'expense-food-1',
    { id: 'expense-food-1', name: '早餐', parentId: 'expense-food' },
  ],
  [
    'income-salary',
    { id: 'income-salary', name: '工资', parentId: null },
  ],
]);

const entries = [
  {
    id: 'breakfast',
    type: 'expense' as const,
    amountMinor: 1800,
    categoryId: 'expense-food',
    subcategoryId: 'expense-food-1',
    localDate: '2026-11-05',
    note: '楼下包子',
  },
  {
    id: 'salary',
    type: 'income' as const,
    amountMinor: 800000,
    categoryId: 'income-salary',
    subcategoryId: null,
    localDate: '2026-11-01',
    note: '十月工资',
  },
];

describe('ledger search filters', () => {
  it('normalizes text, type, category, date and yuan amount inputs', () => {
    expect(
      normalizeLedgerSearchFilters({
        query: '  包子  ',
        type: 'expense',
        categoryId: 'expense-food',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        minAmount: '10',
        maxAmount: '20.50',
      }),
    ).toEqual({
      query: '包子',
      type: 'expense',
      categoryId: 'expense-food',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      minAmountMinor: 1000,
      maxAmountMinor: 2050,
    });
  });

  it('accepts an empty filter set', () => {
    expect(normalizeLedgerSearchFilters({})).toEqual({
      query: '',
      type: 'all',
      categoryId: null,
      startDate: null,
      endDate: null,
      minAmountMinor: null,
      maxAmountMinor: null,
    });
  });

  it('rejects malformed or reversed ranges', () => {
    expect(() =>
      normalizeLedgerSearchFilters({ startDate: '2026-11-30', endDate: '2026-11-01' }),
    ).toThrow('开始日期不能晚于结束日期');
    expect(() =>
      normalizeLedgerSearchFilters({ minAmount: '20', maxAmount: '10' }),
    ).toThrow('最低金额不能大于最高金额');
    expect(() => normalizeLedgerSearchFilters({ minAmount: 'abc' })).toThrow(
      '金额格式不正确',
    );
  });
});

describe('ledger search date picker', () => {
  it('opens a selected date without carrying a time of day', () => {
    const selected = dateFromLocalDateKey('2026-10-31');

    expect([
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      selected.getHours(),
      selected.getMinutes(),
    ]).toEqual([2026, 9, 31, 0, 0]);
  });

  it('opens an empty date range on the current local calendar day', () => {
    const fallback = new Date(2026, 10, 5, 18, 42);
    const selected = dateFromLocalDateKey(null, fallback);

    expect([
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
      selected.getHours(),
      selected.getMinutes(),
    ]).toEqual([2026, 10, 5, 0, 0]);
  });

  it('writes a picked day into only the requested date boundary', () => {
    const draft = {
      query: '咖啡',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      minAmount: '10',
    };

    expect(updateSearchDate(draft, 'startDate', new Date(2026, 10, 2, 21, 15))).toEqual({
      ...draft,
      startDate: '2026-11-02',
    });
    expect(updateSearchDate(draft, 'endDate', new Date(2026, 10, 5, 8, 30))).toEqual({
      ...draft,
      endDate: '2026-11-05',
    });
  });
});

describe('ledger search matching', () => {
  const all = normalizeLedgerSearchFilters({});

  it('matches notes, category and subcategory names', () => {
    expect(matchesLedgerSearch(entries[0]!, all, categoryById, '包子')).toBe(true);
    expect(matchesLedgerSearch(entries[0]!, all, categoryById, '餐饮')).toBe(true);
    expect(matchesLedgerSearch(entries[0]!, all, categoryById, '早餐')).toBe(true);
    expect(matchesLedgerSearch(entries[1]!, all, categoryById, '餐饮')).toBe(false);
  });

  it('combines every filter with AND semantics', () => {
    const filters = normalizeLedgerSearchFilters({
      query: '包子',
      type: 'expense',
      categoryId: 'expense-food',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      minAmount: '18',
      maxAmount: '18',
    });
    expect(matchesLedgerSearch(entries[0]!, filters, categoryById)).toBe(true);
    expect(
      matchesLedgerSearch(
        entries[0]!,
        normalizeLedgerSearchFilters({ type: 'income' }),
        categoryById,
      ),
    ).toBe(false);
  });

  it('counts only active filters for the result summary', () => {
    expect(countActiveSearchFilters(all)).toBe(0);
    expect(
      countActiveSearchFilters(
        normalizeLedgerSearchFilters({
          query: '早餐',
          type: 'expense',
          startDate: '2026-11-01',
          minAmount: '10',
        }),
      ),
    ).toBe(4);
  });
});
