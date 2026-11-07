import type { FeedbackType } from '@shengzhang/contracts';

import type { StoredFeedback } from './feedback-store.js';

const TYPE_LABELS: Array<[FeedbackType, string]> = [
  ['feature', '功能建议'],
  ['usage', '使用问题'],
  ['voice', '语音'],
  ['ledger', '记账'],
  ['privacy', '数据安全'],
  ['other', '其他'],
];

export function formatFeedbackSummary(
  records: StoredFeedback[],
  options: { date: string; directory: string },
): string {
  const counts = new Map<FeedbackType, number>();
  for (const record of records) {
    counts.set(record.type, (counts.get(record.type) ?? 0) + 1);
  }

  const lines = [
    `声账改进与反馈 · ${options.date} · ${options.directory}`,
    '',
    `总数 ${records.length}`,
  ];
  for (const [type, label] of TYPE_LABELS) {
    const count = counts.get(type) ?? 0;
    if (count > 0) lines.push(`${label} ${count}`);
  }
  return lines.join('\n');
}
