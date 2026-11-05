import { parseYuanToCents } from '@shengzhang/domain';

import { localDateKey } from '../../utils/date';

export type SearchTransactionType = 'all' | 'expense' | 'income';
export type LedgerSearchDateField = 'startDate' | 'endDate';

export interface LedgerSearchFilters {
  query: string;
  type: SearchTransactionType;
  categoryId: string | null;
  startDate: string | null;
  endDate: string | null;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
}

export interface LedgerSearchDraft {
  query?: string;
  type?: SearchTransactionType;
  categoryId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  minAmount?: string;
  maxAmount?: string;
}

export interface SearchableLedgerEntry {
  id: string;
  type: 'expense' | 'income';
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
  localDate: string;
  note: string;
}

export interface SearchCategory {
  id: string;
  name: string;
  parentId: string | null;
}

export function dateFromLocalDateKey(
  value: string | null | undefined,
  fallback = new Date(),
): Date {
  const normalized = value?.trim() ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(year!, month! - 1, day!);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month! - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

export function updateSearchDate(
  draft: LedgerSearchDraft,
  field: LedgerSearchDateField,
  date: Date,
): LedgerSearchDraft {
  return {
    ...draft,
    [field]: localDateKey(date),
  };
}

function parseDate(value: string | null | undefined, label: string): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label}格式不正确`);
  }
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label}格式不正确`);
  }
  return normalized;
}

function parseAmount(value: string | undefined, label: string): number | null {
  const normalized = value?.trim() ?? '';
  if (!normalized) return null;
  const amountMinor = parseYuanToCents(normalized);
  if (amountMinor === null) throw new Error('金额格式不正确');
  return amountMinor;
}

export function normalizeLedgerSearchFilters(input: LedgerSearchDraft): LedgerSearchFilters {
  const query = input.query?.trim().slice(0, 80) ?? '';
  const type = input.type ?? 'all';
  if (!['all', 'expense', 'income'].includes(type)) throw new Error('收支类型不正确');
  const startDate = parseDate(input.startDate, '开始日期');
  const endDate = parseDate(input.endDate, '结束日期');
  if (startDate && endDate && startDate > endDate) {
    throw new Error('开始日期不能晚于结束日期');
  }
  const minAmountMinor = parseAmount(input.minAmount, '最低金额');
  const maxAmountMinor = parseAmount(input.maxAmount, '最高金额');
  if (
    minAmountMinor !== null &&
    maxAmountMinor !== null &&
    minAmountMinor > maxAmountMinor
  ) {
    throw new Error('最低金额不能大于最高金额');
  }
  return {
    query,
    type,
    categoryId: input.categoryId?.trim() || null,
    startDate,
    endDate,
    minAmountMinor,
    maxAmountMinor,
  };
}

export function matchesLedgerSearch(
  entry: SearchableLedgerEntry,
  filters: LedgerSearchFilters,
  categoryById: ReadonlyMap<string, SearchCategory>,
  queryOverride?: string,
): boolean {
  const query = (queryOverride ?? filters.query).trim().toLocaleLowerCase('zh-CN');
  if (query) {
    const category = categoryById.get(entry.categoryId);
    const subcategory = entry.subcategoryId ? categoryById.get(entry.subcategoryId) : null;
    const haystack = [entry.note, category?.name, subcategory?.name]
      .filter(Boolean)
      .join('\n')
      .toLocaleLowerCase('zh-CN');
    if (!haystack.includes(query)) return false;
  }
  if (filters.type !== 'all' && entry.type !== filters.type) return false;
  if (filters.categoryId) {
    const selected = categoryById.get(filters.categoryId);
    const categoryMatches =
      selected?.parentId === null
        ? entry.categoryId === filters.categoryId
        : entry.subcategoryId === filters.categoryId;
    if (!categoryMatches) return false;
  }
  if (filters.startDate && entry.localDate < filters.startDate) return false;
  if (filters.endDate && entry.localDate > filters.endDate) return false;
  if (filters.minAmountMinor !== null && entry.amountMinor < filters.minAmountMinor) {
    return false;
  }
  if (filters.maxAmountMinor !== null && entry.amountMinor > filters.maxAmountMinor) {
    return false;
  }
  return true;
}

export function countActiveSearchFilters(filters: LedgerSearchFilters): number {
  return [
    filters.query.length > 0,
    filters.type !== 'all',
    filters.categoryId !== null,
    filters.startDate !== null,
    filters.endDate !== null,
    filters.minAmountMinor !== null,
    filters.maxAmountMinor !== null,
  ].filter(Boolean).length;
}
