import { formatCents } from './money';
import type { TransactionSource, TransactionType } from './transaction';

export interface PortableCategory {
  id: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  icon: string;
  color: string;
  sortOrder: number;
  isPreset: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortableTransaction {
  id: string;
  type: TransactionType;
  amountMinor: number;
  currency: 'CNY';
  categoryId: string;
  subcategoryId: string | null;
  occurredAt: string;
  note: string;
  source: TransactionSource;
  voiceBatchId: string | null;
  voiceEntryIndex: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PortableVoiceBatch {
  requestId: string;
  transcript: string;
  entryCount: number;
  unresolvedFields: string;
  undoExpiresAt: string;
  createdAt: string;
}

export interface PortableAppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PortableBackupData {
  categories: PortableCategory[];
  transactions: PortableTransaction[];
  voiceBatches: PortableVoiceBatch[];
  appSettings: PortableAppSetting[];
}

export interface BackupDocumentV1 {
  format: 'shengzhang-backup';
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  counts: {
    transactions: number;
    categories: number;
    voiceBatches: number;
  };
  checksum: string;
  data: PortableBackupData;
}

export interface CsvTransactionRow {
  occurredAt: string;
  type: TransactionType;
  amountMinor: number;
  categoryName: string;
  subcategoryName: string | null;
  note: string;
  source: TransactionSource;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string') throw new Error(message);
  return value;
}

function requireNullableString(value: unknown, message: string): string | null {
  if (value !== null && typeof value !== 'string') throw new Error(message);
  return value as string | null;
}

function requireBoolean(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') throw new Error(message);
  return value;
}

function requireInteger(value: unknown, message: string): number {
  if (!Number.isSafeInteger(value)) throw new Error(message);
  return value as number;
}

function requirePositiveInteger(value: unknown, message: string): number {
  const integer = requireInteger(value, message);
  if (integer <= 0) throw new Error(message);
  return integer;
}

function requireDate(value: unknown, message: string): string {
  if (!isValidDateString(value)) throw new Error(message);
  return value;
}

function requireArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}

function snapshotChecksum(data: PortableBackupData): string {
  return fnv1a32(JSON.stringify(data));
}

function parseCategory(value: unknown, index: number): PortableCategory {
  if (!isRecord(value)) throw new Error(`分类第 ${index + 1} 项格式不正确`);
  const type = value.type;
  if (type !== 'expense' && type !== 'income') throw new Error('分类类型不正确');
  return {
    id: requireString(value.id, '分类 ID 不正确'),
    name: requireString(value.name, '分类名称不正确'),
    type,
    parentId: requireNullableString(value.parentId, '分类上级引用不正确'),
    icon: requireString(value.icon, '分类图标不正确'),
    color: requireString(value.color, '分类颜色不正确'),
    sortOrder: requireInteger(value.sortOrder, '分类排序不正确'),
    isPreset: requireBoolean(value.isPreset, '分类预设状态不正确'),
    isArchived: requireBoolean(value.isArchived, '分类归档状态不正确'),
    createdAt: requireDate(value.createdAt, '分类创建时间不正确'),
    updatedAt: requireDate(value.updatedAt, '分类更新时间不正确'),
  };
}

function parseTransaction(value: unknown, index: number): PortableTransaction {
  if (!isRecord(value)) throw new Error(`账单第 ${index + 1} 项格式不正确`);
  const type = value.type;
  const source = value.source;
  if (type !== 'expense' && type !== 'income') throw new Error('账单类型不正确');
  if (source !== 'voice' && source !== 'manual') throw new Error('账单来源不正确');
  if (value.currency !== 'CNY') throw new Error('账单币种不正确');
  const voiceEntryIndex =
    value.voiceEntryIndex === null
      ? null
      : requireInteger(value.voiceEntryIndex, '语音账单序号不正确');
  return {
    id: requireString(value.id, '账单 ID 不正确'),
    type,
    amountMinor: requirePositiveInteger(value.amountMinor, '账单金额不正确'),
    currency: 'CNY',
    categoryId: requireString(value.categoryId, '账单分类不正确'),
    subcategoryId: requireNullableString(value.subcategoryId, '账单二级分类不正确'),
    occurredAt: requireDate(value.occurredAt, '账单发生时间不正确'),
    note: requireString(value.note, '账单备注不正确'),
    source,
    voiceBatchId: requireNullableString(value.voiceBatchId, '语音批次引用不正确'),
    voiceEntryIndex,
    createdAt: requireDate(value.createdAt, '账单创建时间不正确'),
    updatedAt: requireDate(value.updatedAt, '账单更新时间不正确'),
    deletedAt:
      value.deletedAt === null
        ? null
        : requireDate(value.deletedAt, '账单删除时间不正确'),
  };
}

function parseVoiceBatch(value: unknown, index: number): PortableVoiceBatch {
  if (!isRecord(value)) throw new Error(`语音批次第 ${index + 1} 项格式不正确`);
  return {
    requestId: requireString(value.requestId, '语音批次 ID 不正确'),
    transcript: requireString(value.transcript, '语音转写不正确'),
    entryCount: requireInteger(value.entryCount, '语音账单数量不正确'),
    unresolvedFields: requireString(value.unresolvedFields, '语音未解决字段不正确'),
    undoExpiresAt: requireDate(value.undoExpiresAt, '语音撤销时间不正确'),
    createdAt: requireDate(value.createdAt, '语音批次创建时间不正确'),
  };
}

function parseAppSetting(value: unknown, index: number): PortableAppSetting {
  if (!isRecord(value)) throw new Error(`设置第 ${index + 1} 项格式不正确`);
  return {
    key: requireString(value.key, '设置键不正确'),
    value: requireString(value.value, '设置值不正确'),
    updatedAt: requireDate(value.updatedAt, '设置更新时间不正确'),
  };
}

function ensureUniqueIds(items: ReadonlyArray<{ id?: string; requestId?: string }>, message: string) {
  const ids = items.map((item) => item.id ?? item.requestId);
  if (new Set(ids).size !== ids.length) throw new Error(message);
}

function validateReferences(data: PortableBackupData) {
  const categoryMap = new Map(data.categories.map((category) => [category.id, category]));
  for (const category of data.categories) {
    if (!category.parentId) continue;
    const parent = categoryMap.get(category.parentId);
    if (!parent || parent.parentId !== null || parent.type !== category.type) {
      throw new Error('分类引用了不存在的上级分类');
    }
  }

  const voiceBatchIds = new Set(data.voiceBatches.map((batch) => batch.requestId));
  for (const transaction of data.transactions) {
    const category = categoryMap.get(transaction.categoryId);
    if (!category || category.parentId !== null || category.type !== transaction.type) {
      throw new Error('账单引用了不存在的分类');
    }
    if (transaction.subcategoryId) {
      const subcategory = categoryMap.get(transaction.subcategoryId);
      if (!subcategory || subcategory.parentId !== transaction.categoryId) {
        throw new Error('账单引用了不存在的二级分类');
      }
    }
    if (transaction.voiceBatchId && !voiceBatchIds.has(transaction.voiceBatchId)) {
      throw new Error('账单引用了不存在的语音批次');
    }
  }
}

function parseData(value: unknown): PortableBackupData {
  if (!isRecord(value)) throw new Error('备份数据格式不正确');
  const categories = requireArray(value.categories, '备份缺少分类').map(parseCategory);
  const transactions = requireArray(value.transactions, '备份缺少账单').map(parseTransaction);
  const voiceBatches = requireArray(value.voiceBatches, '备份缺少语音批次').map(parseVoiceBatch);
  const appSettings = requireArray(value.appSettings, '备份缺少设置').map(parseAppSetting);
  ensureUniqueIds(categories, '备份中有重复分类');
  ensureUniqueIds(transactions, '备份中有重复账单');
  ensureUniqueIds(voiceBatches, '备份中有重复语音批次');
  ensureUniqueIds(appSettings.map((setting) => ({ id: setting.key })), '备份中有重复设置');
  const data = { categories, transactions, voiceBatches, appSettings };
  validateReferences(data);
  return data;
}

export function buildBackupDocument(input: {
  exportedAt: string;
  appVersion: string;
  data: PortableBackupData;
}): BackupDocumentV1 {
  if (!isValidDateString(input.exportedAt)) throw new Error('导出时间不正确');
  const appVersion = input.appVersion.trim();
  if (!appVersion) throw new Error('App 版本不能为空');
  const data = parseData(input.data);
  return {
    format: 'shengzhang-backup',
    schemaVersion: 1,
    exportedAt: input.exportedAt,
    appVersion,
    counts: {
      transactions: data.transactions.length,
      categories: data.categories.length,
      voiceBatches: data.voiceBatches.length,
    },
    checksum: snapshotChecksum(data),
    data,
  };
}

export function parseBackupDocument(value: unknown): BackupDocumentV1 {
  if (!isRecord(value)) throw new Error('备份文件格式不正确');
  if (value.format !== 'shengzhang-backup') throw new Error('这不是声账备份文件');
  if (value.schemaVersion !== 1) throw new Error('备份版本不受支持');
  if (!isValidDateString(value.exportedAt) || typeof value.appVersion !== 'string') {
    throw new Error('备份文件格式不正确');
  }
  const data = parseData(value.data);
  if (!isRecord(value.counts)) throw new Error('备份缺少数量信息');
  if (value.counts.transactions !== data.transactions.length) {
    throw new Error('账单数量与备份内容不一致');
  }
  if (value.counts.categories !== data.categories.length) {
    throw new Error('分类数量与备份内容不一致');
  }
  if (value.counts.voiceBatches !== data.voiceBatches.length) {
    throw new Error('语音批次数量与备份内容不一致');
  }
  const checksum = requireString(value.checksum, '备份缺少校验值');
  if (checksum !== snapshotChecksum(data)) throw new Error('备份校验失败，文件可能已损坏');
  return {
    format: 'shengzhang-backup',
    schemaVersion: 1,
    exportedAt: value.exportedAt,
    appVersion: value.appVersion,
    counts: {
      transactions: data.transactions.length,
      categories: data.categories.length,
      voiceBatches: data.voiceBatches.length,
    },
    checksum,
    data,
  };
}

export function parseBackupText(text: string): BackupDocumentV1 {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('备份文件不是有效的 JSON');
  }
  return parseBackupDocument(value);
}

export function escapeCsvCell(value: string): string {
  const neutralized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replaceAll('"', '""')}"`;
  }
  return neutralized;
}

function localDateTime(occurredAt: string): { date: string; time: string } {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) throw new Error('账单时间不正确');
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

export function buildTransactionsCsv(rows: ReadonlyArray<CsvTransactionRow>): string {
  const header = ['日期', '时间', '类型', '金额', '一级分类', '二级分类', '备注', '来源'];
  const lines = rows.map((row) => {
    const { date, time } = localDateTime(row.occurredAt);
    return [
      date,
      time,
      row.type === 'expense' ? '支出' : '收入',
      formatCents(row.amountMinor),
      row.categoryName,
      row.subcategoryName ?? '',
      row.note,
      row.source === 'voice' ? '语音' : '手动',
    ]
      .map(escapeCsvCell)
      .join(',');
  });
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`;
}
