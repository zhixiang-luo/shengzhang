import { describe, expect, it } from 'vitest';

import {
  buildBackupDocument,
  buildTransactionsCsv,
  escapeCsvCell,
  parseBackupDocument,
  parseBackupText,
} from './data-portability';

const categories = [
  {
    id: 'expense-food',
    name: '餐饮',
    type: 'expense' as const,
    parentId: null,
    icon: 'food',
    color: '#E89A96',
    sortOrder: 0,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'expense-food-1',
    name: '早餐',
    type: 'expense' as const,
    parentId: 'expense-food',
    icon: 'breakfast',
    color: '#E89A96',
    sortOrder: 0,
    isPreset: true,
    isArchived: false,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

const transactions = [
  {
    id: 'transaction-1',
    type: 'expense' as const,
    amountMinor: 2500,
    currency: 'CNY' as const,
    categoryId: 'expense-food',
    subcategoryId: 'expense-food-1',
    occurredAt: '2026-11-05T04:00:00.000Z',
    note: '包子',
    source: 'manual' as const,
    voiceBatchId: null,
    voiceEntryIndex: null,
    createdAt: '2026-11-05T04:00:00.000Z',
    updatedAt: '2026-11-05T04:00:00.000Z',
    deletedAt: null,
  },
];

const voiceBatches = [
  {
    requestId: 'f9f1bde4-0a44-4e6a-bd6e-9f9900476ef3',
    transcript: '午饭二十五',
    entryCount: 1,
    unresolvedFields: '[]',
    undoExpiresAt: '2026-11-05T04:00:08.000Z',
    createdAt: '2026-11-05T04:00:00.000Z',
  },
];

describe('backup documents', () => {
  it('builds a versioned, checksummed document with exact counts', () => {
    const document = buildBackupDocument({
      exportedAt: '2026-11-05T08:00:00.000Z',
      appVersion: '0.1.7',
      data: { categories, transactions, voiceBatches, appSettings: [] },
    });

    expect(document).toMatchObject({
      format: 'shengzhang-backup',
      schemaVersion: 1,
      appVersion: '0.1.7',
      counts: {
        transactions: 1,
        categories: 2,
        voiceBatches: 1,
      },
    });
    expect(document.checksum).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(parseBackupDocument(document)).toEqual(document);
  });

  it('round trips a screen-captured transaction', () => {
    const screenTransaction = { ...transactions[0]!, source: 'screen' as const };
    const document = buildBackupDocument({
      exportedAt: '2026-11-12T10:30:00.000Z',
      appVersion: '0.3.0',
      data: {
        categories,
        transactions: [screenTransaction],
        voiceBatches,
        appSettings: [],
      },
    });

    expect(parseBackupDocument(document).data.transactions[0]?.source).toBe('screen');
  });

  it('rejects unsupported versions, count mismatches, and checksum corruption', () => {
    const document = buildBackupDocument({
      exportedAt: '2026-11-05T08:00:00.000Z',
      appVersion: '0.1.7',
      data: { categories, transactions, voiceBatches, appSettings: [] },
    });

    expect(() => parseBackupDocument({ ...document, schemaVersion: 2 })).toThrow(
      '备份版本不受支持',
    );
    expect(() =>
      parseBackupDocument({
        ...document,
        counts: { ...document.counts, transactions: 2 },
      }),
    ).toThrow('账单数量与备份内容不一致');
    expect(() =>
      parseBackupDocument({
        ...document,
        data: {
          ...document.data,
          transactions: [{ ...transactions[0]!, amountMinor: 9900 }],
        },
      }),
    ).toThrow('备份校验失败');
  });

  it('rejects broken references and malformed rows before restore', () => {
    expect(() =>
      buildBackupDocument({
        exportedAt: '2026-11-05T08:00:00.000Z',
        appVersion: '0.1.7',
        data: {
          categories,
          transactions: [{ ...transactions[0]!, categoryId: 'missing' }],
          voiceBatches,
          appSettings: [],
        },
      }),
    ).toThrow('账单引用了不存在的分类');

    expect(() =>
      parseBackupText(
        JSON.stringify({
          format: 'shengzhang-backup',
          schemaVersion: 1,
          exportedAt: 'not-a-date',
          appVersion: '0.1.7',
          counts: { transactions: 0, categories: 0, voiceBatches: 0 },
          checksum: 'fnv1a32:00000000',
          data: { categories: [], transactions: [], voiceBatches: [], appSettings: [] },
        }),
      ),
    ).toThrow('备份文件格式不正确');
  });
});

describe('CSV export', () => {
  it('adds a UTF-8 BOM and stable Chinese headers', () => {
    const csv = buildTransactionsCsv([
      {
        occurredAt: '2026-11-05T04:00:00.000Z',
        type: 'expense',
        amountMinor: 2500,
        categoryName: '餐饮',
        subcategoryName: '早餐',
        note: '包子,豆浆',
        source: 'manual',
      },
    ]);

    expect(csv.startsWith('\uFEFF日期,时间,类型,金额,一级分类,二级分类,备注,来源')).toBe(true);
    expect(csv).toContain('"包子,豆浆"');
  });

  it('labels a screen-captured transaction as screen recognition', () => {
    const csv = buildTransactionsCsv([
      {
        occurredAt: '2026-11-05T04:00:00.000Z',
        type: 'expense',
        amountMinor: 2500,
        categoryName: '餐饮',
        subcategoryName: null,
        note: '',
        source: 'screen',
      },
    ]);

    expect(csv).toContain('屏幕识别');
  });

  it('neutralizes spreadsheet formulas without hiding the original text', () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.com")')).toBe(
      '"\'=HYPERLINK(""https://example.com"")"',
    );
    expect(escapeCsvCell('+1+1')).toBe("'+1+1");
    expect(escapeCsvCell('@SUM(A1:A2)')).toBe("'@SUM(A1:A2)");
    expect(escapeCsvCell('-2+3')).toBe("'-2+3");
  });
});
