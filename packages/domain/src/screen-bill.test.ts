import { describe, expect, it } from 'vitest';

import {
  extractScreenBill,
  normalizeScreenAmount,
  selectBestAmountCandidate,
  type AmountCandidate,
} from './screen-bill';

describe('screen bill amount normalization', () => {
  it('normalizes full-width currency, separators and yuan suffixes to cents', () => {
    expect(normalizeScreenAmount('￥１,２３４.５０元')).toBe(123450);
  });

  it('rejects order and balance numbers as payment amounts', () => {
    expect(normalizeScreenAmount('订单号 202611120001')).toBeNull();
    expect(normalizeScreenAmount('余额 ¥9999.00')).toBeNull();
  });

  it('selects the actual paid amount over original price and discount', () => {
    const candidates: AmountCandidate[] = [
      { amountMinor: 3500, raw: '原价 ¥35.00', line: '原价 ¥35.00', score: -10 },
      { amountMinor: 900, raw: '优惠 ¥9.00', line: '优惠 ¥9.00', score: -10 },
      { amountMinor: 2600, raw: '实付 ¥26.00', line: '实付 ¥26.00', score: 30 },
    ];

    expect(selectBestAmountCandidate(candidates)).toMatchObject({ amountMinor: 2600 });
  });
});

describe('screen bill extraction', () => {
  it('extracts amount, merchant and time from a payment success page', () => {
    const result = extractScreenBill({
      text: '微信支付\n支付成功\n实付 ¥26.00\n收款方：滴滴出行\n支付时间：今天 18:32',
      now: '2026-11-12T10:00:00.000Z',
      sourceApp: 'wechat',
    });

    expect(result).toMatchObject({
      type: 'expense',
      amountMinor: 2600,
      note: '滴滴出行',
      confidence: 'high',
    });
    expect(new Date(result.occurredAt).getHours()).toBe(18);
    expect(new Date(result.occurredAt).getMinutes()).toBe(32);
    expect(result.warnings).toEqual([]);
  });

  it('returns a low-confidence editable draft when no amount is visible', () => {
    const result = extractScreenBill({
      text: '支付宝\n付款详情\n收款方：便利店',
      now: '2026-11-12T10:00:00.000Z',
      sourceApp: 'alipay',
    });

    expect(result.amountMinor).toBeNull();
    expect(result.note).toBe('便利店');
    expect(result.confidence).toBe('low');
    expect(result.warnings).toContain('没有识别到明确的实付金额，请手动填写');
  });
});
