import { describe, expect, it } from 'vitest';

import type { ScreenCaptureStatus } from '@shengzhang/screen-capture';

import { buildScreenCaptureViewState, mergeScreenCaptureText } from './screenCaptureModel';

const readyStatus: ScreenCaptureStatus = {
  supported: true,
  platform: 'android',
  androidApi: 35,
  accessibilityEnabled: true,
  tileSupported: true,
  autoAddTileSupported: true,
  reason: null,
};

const pendingCapture = {
  captureId: 'capture-1',
  createdAt: '2026-11-12T10:30:00.000Z',
  sourceApp: 'wechat' as const,
  rawText: '微信支付\n支付成功\n实付 ¥26.00\n收款方：滴滴出行\n支付时间：今天 18:32',
  screenshotUri: 'file:///private/capture-1.png',
  captureMethod: 'screenshot' as const,
};

describe('screen capture view state', () => {
  it('reports unsupported when the current runtime has no native screen reader', () => {
    const state = buildScreenCaptureViewState(
      { ...readyStatus, supported: false },
      null,
      '2026-11-12T10:35:00.000Z',
    );

    expect(state).toEqual({ kind: 'unsupported', status: expect.any(Object) });
  });

  it('requires accessibility setup before reading a payment page', () => {
    const state = buildScreenCaptureViewState(
      { ...readyStatus, accessibilityEnabled: false },
      null,
      '2026-11-12T10:35:00.000Z',
    );

    expect(state.kind).toBe('setup_required');
  });

  it('shows an empty result when the user has permission but has not triggered a capture', () => {
    const state = buildScreenCaptureViewState(
      readyStatus,
      null,
      '2026-11-12T10:35:00.000Z',
    );

    expect(state.kind).toBe('empty');
  });

  it('uses accessibility text without waiting for OCR when the paid amount is visible', () => {
    const state = buildScreenCaptureViewState(
      readyStatus,
      pendingCapture,
      '2026-11-12T10:35:00.000Z',
    );

    expect(state).toMatchObject({
      kind: 'ready',
      needsOcr: false,
      extraction: {
        amountMinor: 2600,
        note: '滴滴出行',
        confidence: 'high',
      },
    });
  });

  it('falls back to OCR only when text is insufficient and a screenshot exists', () => {
    const state = buildScreenCaptureViewState(
      readyStatus,
      {
        ...pendingCapture,
        rawText: '微信支付\n付款详情\n收款方：便利店',
      },
      '2026-11-12T10:35:00.000Z',
    );

    expect(state).toMatchObject({ kind: 'ready', needsOcr: true });
  });

  it('merges OCR text without repeating lines already provided by accessibility', () => {
    expect(
      mergeScreenCaptureText(
        '微信支付\n支付成功\n收款方：便利店',
        '支付成功\n实付 ¥8.50\n收款方：便利店',
      ),
    ).toBe('微信支付\n支付成功\n收款方：便利店\n实付 ¥8.50');
  });
});
