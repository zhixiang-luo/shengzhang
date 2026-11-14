import type { ScreenBillExtraction } from '@shengzhang/domain';
import type {
  PendingScreenCapture,
  ScreenCaptureStatus,
} from '@shengzhang/screen-capture';

export type ScreenCaptureViewState =
  | { kind: 'unsupported'; status: ScreenCaptureStatus }
  | { kind: 'setup_required'; status: ScreenCaptureStatus }
  | { kind: 'empty'; status: ScreenCaptureStatus }
  | {
      kind: 'ready';
      status: ScreenCaptureStatus;
      capture: PendingScreenCapture;
      extraction: ScreenBillExtraction;
      needsCloud: boolean;
    };

export function createCloudCaptureDraft(capturedAt: string): ScreenBillExtraction {
  return {
    type: 'expense', amountMinor: null, occurredAt: capturedAt,
    timeSource: 'capture', note: '', confidence: 'low', warnings: [], blockingReason: null,
  };
}

export function captureExpiresAt(pending: PendingScreenCapture): number {
  const createdAt = Date.parse(pending.createdAt);
  return Number.isFinite(createdAt) ? createdAt + 5 * 60_000 : 0;
}

export function buildScreenCaptureViewState(
  status: ScreenCaptureStatus,
  pending: PendingScreenCapture | null,
  now: string,
): ScreenCaptureViewState {
  if (!status.supported) return { kind: 'unsupported', status };
  if (!status.accessibilityEnabled && pending?.captureMethod !== 'shared_image') return { kind: 'setup_required', status };
  if (!pending) return { kind: 'empty', status };

  const extraction = createCloudCaptureDraft(pending.createdAt || now);

  return {
    kind: 'ready',
    status,
    capture: pending,
    extraction,
    needsCloud: Boolean(pending.screenshotUri),
  };
}
