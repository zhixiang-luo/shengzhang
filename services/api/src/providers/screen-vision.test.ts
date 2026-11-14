import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenAiScreenVisionProvider, validateVisionBill } from './screen-vision.js';

const raw = {
  documentType: 'single', paymentStatus: 'success', transactionKind: 'expense',
  currency: 'CNY', amountText: '26.58', amountEvidence: '实付 ￥26.58',
  merchant: '示例餐厅', item: null, categoryId: 'food',
  occurredAt: '2026-11-12T12:31:00+08:00', timeEvidence: '支付时间 2026-11-12 12:31',
};
const context = {
  capturedAt: '2026-11-12T05:00:00.000Z', timezone: 'Asia/Shanghai',
  categories: [{ id: 'food', name: '餐饮', type: 'expense' as const }],
};

afterEach(() => vi.unstubAllGlobals());

describe('vision result validation', () => {
  it('converts decimal money exactly and keeps the explicit page timestamp', () => {
    expect(validateVisionBill(raw, context)).toMatchObject({ amountMinor: 2658, occurredAt: '2026-11-12T04:31:00.000Z', categoryId: 'food', item: null });
  });
  it.each([
    { amountText: '-26.58', amountEvidence: '-26.58\n交易成功' },
    { amountText: '−26.58', amountEvidence: '−26.58\n交易成功' },
    { amountText: '26.58', amountEvidence: '26.58\n交易成功' },
    { amountText: '26.58', amountEvidence: '实际付款\n26.58' },
    { amountText: '26.58', amountEvidence: '-26.58 人民币 交易成功' },
    { amountText: '26.58', amountEvidence: '实付\n¥\n26.58\n交易成功' },
    { amountText: '26.58', amountEvidence: '当前状态：交易成功\n26.58' },
    { amountText: '-26.58', amountEvidence: '交易状态：交易成功\n-26.58' },
  ])('keeps a verified payment header amount: $amountEvidence', (amount) => {
    expect(validateVisionBill({ ...raw, ...amount }, context).amountMinor).toBe(2658);
  });
  it('reads a signed income header without changing its magnitude', () => {
    expect(validateVisionBill({ ...raw, transactionKind: 'income', amountText: '+26.58', amountEvidence: '+26.58\n交易成功' }, context).amountMinor).toBe(2658);
  });
  it.each(['余额\n26.58', '原价\n26.58', '优惠\n26.58', '手续费\n26.58', '26.58\n28.58', '+26.58', '26.588', '订单号\n2658', '支付失败\n26.58'])('rejects unrelated or contradictory header evidence %s', (amountEvidence) => {
    expect(validateVisionBill({ ...raw, amountEvidence }, context).amountMinor).toBeNull();
  });
  it.each([
    { transactionKind: 'income', amountEvidence: '实付 -¥26.58\n交易成功' },
    { transactionKind: 'expense', amountEvidence: '实付 +¥26.58\n交易成功' },
    { transactionKind: 'expense', amountEvidence: '余额\n¥\n26.58' },
    { transactionKind: 'expense', amountEvidence: '余额\n交易成功\n26.58' },
  ])('does not lose the sign or balance label across currency/status text: $amountEvidence', (evidence) => {
    expect(validateVisionBill({ ...raw, ...evidence }, context).amountMinor).toBeNull();
  });
  it.each(['余额 ¥26.58', '原价 ¥26.58', '优惠 ¥26.58', '实付 ¥26.588', '实付 ¥28.58'])('rejects untrusted amount evidence %s', (amountEvidence) => {
    expect(validateVisionBill({ ...raw, amountEvidence }, context).amountMinor).toBeNull();
  });
  it.each(['pending', 'failed', 'unknown'])('blocks %s payments', (paymentStatus) => {
    expect(validateVisionBill({ ...raw, paymentStatus }, context).amountMinor).toBeNull();
  });
  it('blocks explicit closed-payment evidence even when the model calls it successful', () => {
    const result = validateVisionBill({ ...raw, paymentStatus: 'success', amountEvidence: '-26.58 人民币 交易关闭' }, context);
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).not.toBeNull();
  });
  it.each(['交易状态：已关闭', '支付已取消', '当前状态：已撤销', '已关闭', '交易状态：处理中', '支付状态：等待扣款', '当前状态：待扣款', '付款状态\n处理中', '交易状态：未知'])('hard-blocks unsuccessful status evidence %s despite a success classification', (status) => {
    const result = validateVisionBill({ ...raw, amountEvidence: `实付 ¥26.58\n${status}` }, context);
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).not.toBeNull();
  });
  it.each(['交易状态：交易成功', '支付状态：已支付', '付款状态\n付款成功', '当前状态：已完成'])('keeps a successful status label %s', (status) => {
    expect(validateVisionBill({ ...raw, amountEvidence: `实付 ¥26.58\n${status}` }, context)).toMatchObject({ amountMinor: 2658, blockingReason: null });
  });
  it.each(['日元', 'JPY', '澳元', 'AUD', 'CAD', 'HKD', 'USD', '$', 'INR', 'CHF', '马来西亚林吉特'])('hard-blocks explicit foreign evidence %s despite a CNY classification', (unit) => {
    const result = validateVisionBill({ ...raw, amountEvidence: `实付 26.58 ${unit}\n交易成功` }, context);
    expect(result.amountMinor).toBeNull();
    expect(result.blockingReason).not.toBeNull();
  });
  it('distinguishes a missing model amount from a figure rejected by validation', () => {
    expect(validateVisionBill({ ...raw, amountText: null, amountEvidence: null }, context).amountIssue).toBe('not_read');
    expect(validateVisionBill({ ...raw, amountEvidence: '余额 ¥26.58' }, context).amountIssue).toBe('unverified');
  });
  it.each(['transfer', 'refund', 'unknown'])('does not reinterpret %s as an expense', (transactionKind) => {
    expect(validateVisionBill({ ...raw, transactionKind }, context).amountMinor).toBeNull();
  });
  it('rejects multi-transaction pages', () => {
    expect(validateVisionBill({ ...raw, documentType: 'list' }, context).amountMinor).toBeNull();
  });
  it('does not assign a category absent from the enabled category list', () => {
    expect(validateVisionBill({ ...raw, categoryId: 'invented' }, context).categoryId).toBeNull();
  });
  it('keeps time unknown if the proposed ISO time differs from the evidence', () => {
    expect(validateVisionBill({ ...raw, occurredAt: '2026-11-13T12:31:00+08:00' }, context).occurredAt).toBeNull();
  });
  it('keeps time unknown without explicit time evidence', () => {
    expect(validateVisionBill({ ...raw, timeEvidence: null }, context).occurredAt).toBeNull();
  });
  it.each(['订单创建时间 2026-11-12 12:31', '下单时间 2026-11-12 12:31', '2026-11-12 12:31'])('does not mark non-transaction time evidence %s as the payment time', (timeEvidence) => {
    expect(validateVisionBill({ ...raw, timeEvidence }, context).occurredAt).toBeNull();
  });
  it('drops an overlong description without losing a verified amount', () => {
    const result = validateVisionBill({
      ...raw,
      item: '这是一段很长的商品说明'.repeat(8),
      merchant: '商户名称'.repeat(12),
    }, context);
    expect(result).toMatchObject({ amountMinor: 2658, occurredAt: '2026-11-12T04:31:00.000Z', item: null });
    expect(result.merchant?.length).toBeLessThanOrEqual(40);
  });
  it('continues to reject unknown model fields', () => {
    expect(() => validateVisionBill({ ...raw, modelThought: 'untrusted extra field' }, context)).toThrow();
  });
  it('continues to reject amount evidence that fails financial validation', () => {
    expect(validateVisionBill({ ...raw, amountEvidence: '余额 ¥26.58' }, context)).toMatchObject({
      amountMinor: null,
      amountIssue: 'unverified',
    });
  });
});

describe('vision provider', () => {
  it('requests non-thinking JSON output from the official Qwen model', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      expect(url).toBe('https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1/chat/completions');
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({ model: 'qwen3-vl-plus', enable_thinking: false, response_format: { type: 'json_object' } });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }));
    });
    const provider = new OpenAiScreenVisionProvider({ apiKey: 'test', baseUrl: 'https://cn-beijing.maas.qianwenaiapi.com/compatible-mode/v1', model: 'qwen3-vl-plus', thinking: 'qwen' });
    const result = await provider.parse({ ...context, image: { mimeType: 'image/png', base64: 'aGVsbG8=' } });
    expect(result.amountMinor).toBe(2658);
  });
  it('requests DeepSeek non-thinking JSON output', async () => {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      expect(url).toBe('https://api.deepseek.com/chat/completions');
      const body = JSON.parse(String(init.body));
      expect(body).toMatchObject({
        model: 'deepseek-flash',
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
      });
      expect(body).not.toHaveProperty('enable_thinking');
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }));
    });
    const provider = new OpenAiScreenVisionProvider({
      apiKey: 'test',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
      thinking: 'deepseek',
    });
    const result = await provider.parse({ ...context, image: { mimeType: 'image/png', base64: 'aGVsbG8=' } });
    expect(result.amountMinor).toBe(2658);
  });
  it('parses a real HTTP-shaped completion and validates its money', async () => {
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.messages[1].content[0].image_url.url).toBe('data:image/png;base64,aGVsbG8=');
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }));
    });
    const provider = new OpenAiScreenVisionProvider({ apiKey: 'test', baseUrl: 'https://vision.example/v1', model: 'vision-test' });
    const result = await provider.parse({ ...context, image: { mimeType: 'image/png', base64: 'aGVsbG8=' } });
    expect(result.amountMinor).toBe(2658);
  });
  it('returns a stable failure instead of accepting malformed provider JSON', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"amountText":26}' } }] })));
    const provider = new OpenAiScreenVisionProvider({ apiKey: 'test', baseUrl: 'https://vision.example/v1', model: 'vision-test' });
    await expect(provider.parse({ ...context, image: { mimeType: 'image/png', base64: 'aGVsbG8=' } })).rejects.toThrow();
  });
});
