import type { PendingScreenCapture } from '@shengzhang/screen-capture';

export const DEMO_CAPTURE_ID = 'preview-wechat-taxi';

export function createDemoCapture(now = new Date()): PendingScreenCapture {
  return {
    captureId: DEMO_CAPTURE_ID,
    createdAt: now.toISOString(),
    sourceApp: 'wechat',
    rawText: [
      '微信支付',
      '支付成功',
      '实付 ¥26.00',
      '收款方：滴滴出行',
      '支付时间：今天 18:32',
    ].join('\n'),
    screenshotUri: null,
    captureMethod: 'accessibility',
  };
}
