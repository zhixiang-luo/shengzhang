import { extractScreenBill, type ScreenBillExtraction } from '@shengzhang/domain';
import {
  clearCapture,
  getPendingCapture,
  getScreenCaptureStatus,
  recognizeCaptureImage,
  type PendingScreenCapture,
  type ScreenCaptureStatus,
} from '@shengzhang/screen-capture';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createDemoCapture } from './demoCapture';
import {
  buildScreenCaptureViewState,
  mergeScreenCaptureText,
  type ScreenCaptureViewState,
} from './screenCaptureModel';

interface UseScreenCaptureOptions {
  demo?: boolean;
}

interface ScreenCaptureState {
  status: ScreenCaptureStatus | null;
  pending: PendingScreenCapture | null;
  extraction: ScreenBillExtraction | null;
  screenshotUri: string | null;
  sourceText: string;
  loading: boolean;
  recognizing: boolean;
  error: string | null;
}

const initialState: ScreenCaptureState = {
  status: null,
  pending: null,
  extraction: null,
  screenshotUri: null,
  sourceText: '',
  loading: true,
  recognizing: false,
  error: null,
};

const demoStatus: ScreenCaptureStatus = {
  supported: true,
  platform: 'android',
  androidApi: 35,
  accessibilityEnabled: true,
  tileSupported: true,
  autoAddTileSupported: true,
  reason: null,
};

function extract(pending: PendingScreenCapture, now: string): ScreenBillExtraction {
  return extractScreenBill({
    text: pending.rawText,
    now,
    sourceApp: pending.sourceApp,
  });
}

export function useScreenCapture({ demo = false }: UseScreenCaptureOptions = {}) {
  const [state, setState] = useState<ScreenCaptureState>(initialState);
  const activeRef = useRef(true);
  const ocrCaptureRef = useRef<string | null>(null);

  const runOcr = useCallback(async (pending: PendingScreenCapture) => {
    if (
      demo ||
      ocrCaptureRef.current === pending.captureId ||
      pending.captureMethod !== 'screenshot' ||
      !pending.screenshotUri ||
      extract(pending, new Date().toISOString()).amountMinor !== null
    ) {
      return;
    }

    ocrCaptureRef.current = pending.captureId;
    setState((current) => ({ ...current, recognizing: true, error: null }));
    try {
      const ocrText = await recognizeCaptureImage(pending.captureId);
      if (!activeRef.current) return;
      const mergedText = mergeScreenCaptureText(pending.rawText, ocrText);
      setState((current) => ({
        ...current,
        sourceText: mergedText,
        extraction: extractScreenBill({
          text: mergedText,
          now: new Date().toISOString(),
          sourceApp: pending.sourceApp,
        }),
        recognizing: false,
        error: ocrText.trim() ? null : '截图里没有读到可用文字，请手动补充金额',
      }));
    } catch {
      if (!activeRef.current) return;
      setState((current) => ({
        ...current,
        recognizing: false,
        error: '本地文字识别失败，请手动补充金额',
      }));
    }
  }, [demo]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      if (demo) {
        const pending = createDemoCapture();
        if (!activeRef.current) return;
        setState({
          status: demoStatus,
          pending,
          extraction: extract(pending, pending.createdAt),
          screenshotUri: pending.screenshotUri,
          sourceText: pending.rawText,
          loading: false,
          recognizing: false,
          error: null,
        });
        return;
      }

      const [status, pending] = await Promise.all([
        getScreenCaptureStatus(),
        getPendingCapture(),
      ]);
      if (!activeRef.current) return;
      const extraction = pending ? extract(pending, new Date().toISOString()) : null;
      setState({
        status,
        pending,
        extraction,
        screenshotUri: pending?.screenshotUri ?? null,
        sourceText: pending?.rawText ?? '',
        loading: false,
        recognizing: false,
        error: null,
      });
      if (pending && extraction?.amountMinor === null) void runOcr(pending);
    } catch {
      if (!activeRef.current) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: '无法读取付款页，请返回设置检查权限',
      }));
    }
  }, [demo, runOcr]);

  useEffect(() => {
    activeRef.current = true;
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => {
      cancelAnimationFrame(frame);
      activeRef.current = false;
    };
  }, [load]);

  const viewState: ScreenCaptureViewState | null =
    state.status && !state.loading
      ? (() => {
          const base = buildScreenCaptureViewState(
            state.status,
            state.pending,
            new Date().toISOString(),
          );
          if (base.kind !== 'ready' || !state.extraction || !state.pending) return base;
          return {
            ...base,
            extraction: state.extraction,
            needsOcr: false,
          };
        })()
      : null;

  const retryOcr = useCallback(() => {
    if (!state.pending) return;
    ocrCaptureRef.current = null;
    void runOcr(state.pending);
  }, [runOcr, state.pending]);

  const discard = useCallback(async () => {
    const captureId = state.pending?.captureId;
    if (!captureId || demo) return;
    await clearCapture(captureId);
  }, [demo, state.pending?.captureId]);

  return {
    ...state,
    viewState,
    isDemo: demo,
    reload: load,
    retryOcr,
    discard,
  };
}
