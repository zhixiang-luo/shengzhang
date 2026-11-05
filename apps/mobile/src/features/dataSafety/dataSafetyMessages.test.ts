import { buildBackupDocument } from '@shengzhang/domain';
import { describe, expect, it } from 'vitest';

import {
  buildClearConfirmation,
  buildRestoreConfirmation,
  formatDataSafetyError,
  formatLastExportAt,
} from './dataSafetyMessages';

const backup = buildBackupDocument({
  exportedAt: '2026-11-05T08:00:00.000Z',
  appVersion: '0.1.7',
  data: {
    categories: [],
    transactions: [],
    voiceBatches: [],
    appSettings: [],
  },
});

describe('data safety messages', () => {
  it('describes a backup before restoring', () => {
    expect(buildRestoreConfirmation(backup, 8)).toEqual({
      title: '恢复这份备份？',
      message:
        '备份包含 0 笔账单、0 个分类，导出于 2026-11-05 16:00。\n\n当前本机的 8 笔账单将被覆盖，且无法撤销。建议先导出当前账本。',
    });
  });

  it('does not warn about overwriting an empty ledger', () => {
    expect(buildRestoreConfirmation(backup, 0).message).toContain('本机还没有账单，可以直接恢复。');
  });

  it('makes destructive local clearing explicit', () => {
    expect(buildClearConfirmation(12)).toEqual({
      title: '清空本机账本？',
      message:
        '将永久删除 12 笔账单、分类排序和语音批次。当前没有云备份，删除后无法从服务器找回。建议先导出 JSON 备份。',
    });
  });

  it('hides technical exceptions while preserving backup validation guidance', () => {
    expect(formatDataSafetyError(new Error('备份校验失败，文件可能已损坏'))).toBe(
      '备份校验失败，文件可能已损坏。当前账本没有被修改。',
    );
    expect(formatDataSafetyError(new Error('disk I/O error (code 10)'))).toBe(
      '数据操作失败，当前账本没有被修改。请确认存储空间充足后重试。',
    );
  });

  it('formats missing and valid last-export timestamps', () => {
    expect(formatLastExportAt(null)).toBe('还没有导出过');
    expect(
      formatLastExportAt('2026-11-05T08:00:00.000Z', new Date('2026-11-05T10:00:00.000Z')),
    ).toBe('今天 16:00');
  });
});
