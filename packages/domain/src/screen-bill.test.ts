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
  const read = (text: string) => extractScreenBill({
    text, now: '2026-11-12T10:00:00.000Z', sourceApp: 'wechat',
  });

  it('keeps full-width decimal digits together', () => {
    expect(read('付款成功\n实付 ￥２６．５８ 元').amountMinor).toBe(2658);
  });

  it('associates a paid label with an integer in a separate node', () => {
    expect(read('支付成功\n实付\n¥\n26').amountMinor).toBe(2600);
  });

  it('excludes a balance value whose label is in the previous node', () => {
    expect(read('支付成功\n余额\n9999.00\n实付\n26').amountMinor).toBe(2600);
  });

  it.each(['账户余额\n9999.00', '可用余额（元）\n¥9999.00', '优惠金额\n9.00\n原价\n35.00'])('preserves the excluded role of split field %s', (field) => {
    expect(read(`支付成功\n${field}`).amountMinor).toBeNull();
  });

  it('does not accept an unrelated bare decimal without a payment field', () => {
    expect(read('支付成功\n会员积分\n26.58').amountMinor).toBeNull();
  });

  it('keeps the amount unconfirmed when only a detail title and amount are visible', () => {
    const result = read('付款详情\n付款金额 ¥26.00');
    expect(result.amountMinor).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.warnings[0]).toContain('未确认');
  });

  it('rejects an awaiting-buyer-payment status', () => {
    const result = read('交易详情\n交易金额 ¥26.00\n交易状态\n等待买家付款');
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).toBeTruthy();
  });

  it.each(['账单详情\n交易成功\n+100.00\n收支类型\n收入', '账单详情\n收款到账\n+100.00'])('keeps an explicitly incoming transaction as income', (text) => {
    expect(read(text)).toMatchObject({ type: 'income', amountMinor: 10000 });
  });

  it.each(['原价 ¥35.00', '优惠 ¥9.00', '余额\n9999.00', '订单号\n202611120001'])('does not invent a payment from %s', (text) => {
    expect(read(`支付成功\n${text}`)).toMatchObject({ amountMinor: null, confidence: 'low' });
  });

  it('does not choose the larger of equally plausible paid amounts', () => {
    expect(read('支付成功\n实付 ¥26.00\n实付 ¥28.00')).toMatchObject({
      amountMinor: null, confidence: 'low',
    });
  });

  it('does not treat repeated evidence of the same amount as conflicting payments', () => {
    expect(read('支付成功\n实付 ¥26.00\n付款金额 ¥26.00')).toMatchObject({
      amountMinor: 2600, confidence: 'high',
    });
  });

  it.each(['26.588', '26..58', '26,58', '2026-11-12'])('rejects malformed money %s instead of extracting a partial number', (amount) => {
    expect(read(`支付成功\n实付 ¥${amount}`).amountMinor).toBeNull();
  });

  it.each(['支付失败', '等待付款', '交易关闭', '转账成功', '退款成功'])('blocks %s from becoming an ordinary expense', (status) => {
    const result = read(`${status}\n交易金额 ¥26.00`);
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).toBeTruthy();
  });

  it('does not treat refund help actions as the current payment status', () => {
    expect(read('支付成功\n实付 ¥26.00\n申请退款\n退款帮助')).toMatchObject({ amountMinor: 2600, blockingReason: null });
  });

  it('blocks a transfer identified by its transaction type', () => {
    expect(read('交易成功\n交易类型：转账\n交易金额 ¥26.00').blockingReason).toBeTruthy();
  });

  it.each(['USD 26.00', 'HKD 26.00', '$26.00', '26.00 美元'])('does not interpret foreign currency %s as yuan', (amount) => {
    const result = read(`支付成功\n交易金额 ${amount}`);
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).toBe('当前仅支持人民币账单');
  });

  it('uses the payment time instead of the status bar clock or order creation time', () => {
    const result = read('09:41\n支付成功\n实付 ¥26\n订单创建时间 2026-11-10 09:30\n支付时间\n2026-11-11 18:32');
    expect(new Date(result.occurredAt).getDate()).toBe(11);
    expect(result.timeSource).toBe('page');
  });

  it('marks the capture time as a default if the page has no time', () => {
    expect(read('支付成功\n实付 ¥26')).toMatchObject({
      occurredAt: '2026-11-12T10:00:00.000Z', timeSource: 'capture',
    });
  });

  it('does not normalize impossible page dates into a different month', () => {
    expect(read('支付成功\n实付 ¥26\n支付时间 2026-02-31 12:30').timeSource).toBe('capture');
  });

  it('prefers explicit product content to the merchant and never invents a product', () => {
    expect(read('支付成功\n实付 ¥26\n商户：示例餐厅\n商品名称：牛肉面').note).toBe('牛肉面');
    expect(read('支付成功\n实付 ¥26\n商户：示例餐厅').note).toBe('示例餐厅');
  });

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
