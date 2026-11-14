import { describe, expect, it } from 'vitest';
import { extractScreenBill } from '@shengzhang/domain';

import { mergeScreenBillDraft, mergeVisionExtraction } from './screenBillDraft';

const local = extractScreenBill({ text: '支付成功\n实付 ¥26.58\n商户：示例餐厅', now: '2026-11-12T05:00:00.000Z', sourceApp: 'wechat' });
const vision = { amountMinor: 2658, type: 'expense' as const, merchant: '示例餐厅', item: '牛肉面', occurredAt: '2026-11-12T04:31:00.000Z', categoryId: 'food', amountEvidence: '实付 ¥26.58', blockingReason: null };

describe('screen bill draft merging', () => {
  it('updates a late transaction time and product when the user has not edited them', () => {
    const merged = mergeVisionExtraction(local, vision);
    const result = mergeScreenBillDraft({ amount: '26.58', note: '', type: 'expense', occurredAt: local.occurredAt, categoryId: 'other', subcategoryId: null }, merged, {}, 'food');
    expect(result).toMatchObject({ amount: '26.58', note: '牛肉面', occurredAt: '2026-11-12T04:31:00.000Z', categoryId: 'food' });
  });
  it('never overwrites the amount, time or category already edited by the user', () => {
    const result = mergeScreenBillDraft({ amount: '30', note: '手动内容', type: 'income', occurredAt: '2026-11-11T04:00:00.000Z', categoryId: 'custom', subcategoryId: 'custom-child' }, mergeVisionExtraction(local, vision), { amount: true, note: true, type: true, occurredAt: true, categoryId: true }, 'food');
    expect(result).toEqual({ amount: '30', note: '手动内容', type: 'income', occurredAt: '2026-11-11T04:00:00.000Z', categoryId: 'custom', subcategoryId: 'custom-child' });
  });
  it('uses the cloud amount without letting obsolete local recognition veto it', () => {
    const merged = mergeVisionExtraction(local, { ...vision, amountMinor: 2858 });
    expect(merged).toMatchObject({ amountMinor: 2858, blockingReason: null, warnings: [] });
  });
  it('does not let a local status guess prevent a successful cloud result', () => {
    const merged = mergeVisionExtraction({ ...local, amountMinor: null, blockingReason: '本地误判待付款' }, vision);
    expect(merged).toMatchObject({ amountMinor: 2658, blockingReason: null });
  });
  it('never fills a missing cloud amount or item with an old local guess', () => {
    const merged = mergeVisionExtraction(local, { ...vision, amountMinor: null, merchant: null, item: null });
    expect(merged).toMatchObject({ amountMinor: null, note: '', confidence: 'low' });
  });
  it('blocks a local expense if the visual model identifies a failed transaction', () => {
    const merged = mergeVisionExtraction(local, { ...vision, amountMinor: null, blockingReason: '未支付成功' });
    expect(merged).toMatchObject({ amountMinor: null, blockingReason: '未支付成功' });
  });
  it('keeps the transaction type belonging to a category explicitly selected by the user', () => {
    const result = mergeScreenBillDraft({ amount: '26.58', note: '', type: 'expense', occurredAt: local.occurredAt, categoryId: 'expense-food', subcategoryId: null }, { ...local, type: 'income' }, { categoryId: true }, 'income-other');
    expect(result).toMatchObject({ type: 'expense', categoryId: 'expense-food' });
  });
});
