import type { PrivacySafeShareSummary } from '@shengzhang/domain';

export interface ReviewSharePreview {
  monthLabel: string;
  headline: string;
  categoryLine: string;
  trendLine: string;
  voiceLine: string | null;
  cta: string;
}

function monthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error('月份格式不正确');
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error('月份格式不正确');
  return `${match[1]}年${monthNumber}月`;
}

function trendSymbol(trend: PrivacySafeShareSummary['trend']): string {
  if (trend === 'up') return '↗';
  if (trend === 'down') return '↘';
  if (trend === 'same') return '→';
  return '→';
}

export function buildReviewSharePreview(
  summary: PrivacySafeShareSummary,
): ReviewSharePreview {
  return {
    monthLabel: monthLabel(summary.month),
    headline: summary.headline,
    categoryLine: `有一类支出去到了 ${summary.topCategoryShareBand} 的区间`,
    trendLine: `${trendSymbol(summary.trend)} ${summary.trendLabel}`,
    voiceLine:
      summary.voiceTransactionCount > 0
        ? `其中 ${summary.voiceTransactionCount} 笔来自语音`
        : null,
    cta: summary.cta,
  };
}

export function buildReviewShareFileName(month: string): string {
  monthLabel(month);
  return `shengzhang-review-${month}.png`;
}
