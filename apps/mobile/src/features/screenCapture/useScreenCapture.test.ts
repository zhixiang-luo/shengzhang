import { describe, expect, it } from 'vitest';

import type { ScreenCaptureStatus } from '@shengzhang/screen-capture';

import { buildScreenCaptureViewState, captureExpiresAt } from './screenCaptureModel';

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

  it('starts with an empty cloud draft even when legacy accessibility text contains an amount', () => {
    const state = buildScreenCaptureViewState(
      readyStatus,
      pendingCapture,
      '2026-11-12T10:35:00.000Z',
    );

    expect(state).toMatchObject({
      kind: 'ready',
      needsCloud: true,
      extraction: {
        amountMinor: null,
        note: '',
        confidence: 'low',
        occurredAt: pendingCapture.createdAt,
        timeSource: 'capture',
      },
    });
  });

  it('requests cloud recognition directly when a screenshot has no accessible text', () => {
    const state = buildScreenCaptureViewState(
      readyStatus,
      {
        ...pendingCapture,
        rawText: '微信支付\n付款详情\n收款方：便利店',
      },
      '2026-11-12T10:35:00.000Z',
    );

    expect(state).toMatchObject({ kind: 'ready', needsCloud: true });
  });

  it('accepts a deliberately shared screenshot without accessibility permission', () => {
    const state = buildScreenCaptureViewState(
      { ...readyStatus, accessibilityEnabled: false },
      { ...pendingCapture, captureMethod: 'shared_image', rawText: '' },
      '2026-11-12T10:35:00.000Z',
    );
    expect(state).toMatchObject({ kind: 'ready', needsCloud: true });
  });

  it('does not accept locally guessed money when there is no image to send', () => {
    const state = buildScreenCaptureViewState(readyStatus, {
      ...pendingCapture, screenshotUri: null,
    }, '2026-11-12T10:35:00.000Z');
    expect(state).toMatchObject({ kind: 'ready', needsCloud: false, extraction: { amountMinor: null } });
  });

  it('expires a capture five minutes after the original capture time', () => {
    expect(captureExpiresAt(pendingCapture)).toBe(Date.parse('2026-11-12T10:35:00.000Z'));
    expect(captureExpiresAt({ ...pendingCapture, createdAt: 'invalid' })).toBe(0);
  });
});
