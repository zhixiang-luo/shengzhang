import { describe, expect, it } from 'vitest';

import {
  buildReviewSharePreview,
  buildReviewShareFileName,
} from './shareCard';

describe('review share card presentation', () => {
  it('formats privacy-safe copy without local ledger details', () => {
    const preview = buildReviewSharePreview({
      month: '2026-10',
      headline: '这个月，我说一句就记下了 4 笔。',
      topCategoryShareBand: '75%–100%',
      trend: 'up',
      trendLabel: '支出比上月多一些',
      voiceTransactionCount: 2,
      cta: '我也来记一句',
    });

    expect(preview).toEqual({
      monthLabel: '2026年10月',
      headline: '这个月，我说一句就记下了 4 笔。',
      categoryLine: '有一类支出去到了 75%–100% 的区间',
      trendLine: '↗ 支出比上月多一些',
      voiceLine: '其中 2 笔来自语音',
      cta: '我也来记一句',
    });
    expect(JSON.stringify(preview)).not.toContain('餐饮');
    expect(JSON.stringify(preview)).not.toContain('2026-10-12');
  });

  it('omits the voice line when there were no voice entries', () => {
    const preview = buildReviewSharePreview({
      month: '2026-10',
      headline: '这个月，我说一句就记下了 1 笔。',
      topCategoryShareBand: '0%–25%',
      trend: 'no_baseline',
      trendLabel: '这个月开始有了自己的节奏',
      voiceTransactionCount: 0,
      cta: '我也来记一句',
    });

    expect(preview.voiceLine).toBeNull();
    expect(preview.trendLine).toBe('→ 这个月开始有了自己的节奏');
  });

  it('builds a stable PNG file name from the month', () => {
    expect(buildReviewShareFileName('2026-10')).toBe('shengzhang-review-2026-10.png');
    expect(() => buildReviewShareFileName('../private')).toThrow('月份格式不正确');
  });
});
