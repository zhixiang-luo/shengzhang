import { extractScreenBill, type ScreenBillExtraction } from '@shengzhang/domain';
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
      needsOcr: boolean;
    };

export function mergeScreenCaptureText(accessibilityText: string, ocrText: string): string {
  const lines: string[] = [];
  const seen = new Set<string>();

  for (const rawLine of `${accessibilityText}\n${ocrText}`.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }

  return lines.join('\n');
}

export function buildScreenCaptureViewState(
  status: ScreenCaptureStatus,
  pending: PendingScreenCapture | null,
  now: string,
): ScreenCaptureViewState {
  if (!status.supported) return { kind: 'unsupported', status };
  if (!status.accessibilityEnabled) return { kind: 'setup_required', status };
  if (!pending) return { kind: 'empty', status };

  const extraction = extractScreenBill({
    text: pending.rawText,
    now,
    sourceApp: pending.sourceApp,
  });

  return {
    kind: 'ready',
    status,
    capture: pending,
    extraction,
    needsOcr:
      extraction.amountMinor === null &&
      Boolean(pending.screenshotUri) &&
      pending.captureMethod === 'screenshot',
  };
}
