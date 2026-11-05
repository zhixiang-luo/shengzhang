import type { BackupDocumentV1 } from '@shengzhang/domain';

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

function shanghaiParts(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

export function formatLastExportAt(value: string | null, now = new Date()): string {
  if (!value) return '还没有导出过';
  const exported = shanghaiParts(value);
  const today = shanghaiParts(now).date;
  return exported.date === today ? `今天 ${exported.time}` : `${exported.date} ${exported.time}`;
}

export function buildRestoreConfirmation(
  backup: BackupDocumentV1,
  currentTransactionCount: number,
) {
  const exported = shanghaiParts(backup.exportedAt);
  const source = `备份包含 ${backup.counts.transactions} 笔账单、${backup.counts.categories} 个分类，导出于 ${exported.date} ${exported.time}。`;
  const consequence =
    currentTransactionCount > 0
      ? `当前本机的 ${currentTransactionCount} 笔账单将被覆盖，且无法撤销。建议先导出当前账本。`
      : '本机还没有账单，可以直接恢复。';
  return {
    title: '恢复这份备份？',
    message: `${source}\n\n${consequence}`,
  };
}

export function buildClearConfirmation(transactionCount: number) {
  return {
    title: '清空本机账本？',
    message: `将永久删除 ${transactionCount} 笔账单、分类排序和语音批次。当前没有云备份，删除后无法从服务器找回。建议先导出 JSON 备份。`,
  };
}

export function formatDataSafetyError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const validationMessages = [
    '这不是声账备份文件',
    '备份版本不受支持',
    '备份文件不是有效的 JSON',
    '备份文件格式不正确',
    '备份校验失败',
    '备份缺少',
    '备份中有重复',
    '账单数量与备份内容不一致',
    '分类数量与备份内容不一致',
    '语音批次数量与备份内容不一致',
    '账单引用了不存在',
    '分类引用了不存在',
    '分类类型不正确',
    '账单类型不正确',
    '账单金额不正确',
  ];
  if (validationMessages.some((known) => message.startsWith(known))) {
    return `${message}。当前账本没有被修改。`;
  }
  return '数据操作失败，当前账本没有被修改。请确认存储空间充足后重试。';
}
