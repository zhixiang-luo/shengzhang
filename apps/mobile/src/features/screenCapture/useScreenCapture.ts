import { extractScreenBill, type ScreenBillExtraction } from '@shengzhang/domain';
import {
  clearCapture, getPendingCapture, getScreenCaptureStatus,
  type PendingScreenCapture, type ScreenCaptureStatus,
} from '@shengzhang/screen-capture';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { CategoryRow } from '../../db/categoryRepository';
import { getScreenCloudConsent, parseScreenImage } from '../../services/screenBillApi';
import { createDemoCapture } from './demoCapture';
import { mergeVisionExtraction } from './screenBillDraft';
import { buildScreenCaptureViewState, captureExpiresAt, createCloudCaptureDraft } from './screenCaptureModel';

interface CaptureState {
  status: ScreenCaptureStatus | null;
  pending: PendingScreenCapture | null;
  extraction: ScreenBillExtraction | null;
  loading: boolean;
  stage: 'cloud' | null;
  needsCloudConsent: boolean;
  suggestedCategoryId: string | null;
  error: string | null;
  expired: boolean;
}
const initial: CaptureState = { status: null, pending: null, extraction: null, loading: true, stage: null, needsCloudConsent: false, suggestedCategoryId: null, error: null, expired: false };
const demoStatus: ScreenCaptureStatus = { supported: true, platform: 'android', androidApi: 35, accessibilityEnabled: true, tileSupported: true, autoAddTileSupported: true, reason: null };
const NO_CATEGORIES: CategoryRow[] = [];

export function useScreenCapture({ demo = false, captureId, categories = NO_CATEGORIES }: { demo?: boolean; captureId?: string; categories?: CategoryRow[] } = {}) {
  const [state, setState] = useState<CaptureState>(initial);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<PendingScreenCapture | null>(null);
  const extractionRef = useRef<ScreenBillExtraction | null>(null);
  const statusRef = useRef<ScreenCaptureStatus | null>(null);
  const busyRef = useRef(false);
  const frozenRef = useRef(false);

  const stopRecognition = useCallback(() => {
    frozenRef.current = true;
    generationRef.current += 1;
    controllerRef.current?.abort();
    busyRef.current = false;
    setState((current) => ({ ...current, stage: null }));
  }, []);

  const ensureFresh = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return false;
    if (demo || Date.now() < captureExpiresAt(pending)) return true;
    stopRecognition();
    pendingRef.current = null;
    extractionRef.current = null;
    setState((current) => ({ ...current, pending: null, extraction: null, stage: null, expired: true, error: '截图已过期，请重新触发快捷记账' }));
    void clearCapture(pending.captureId).catch(() => undefined);
    return false;
  }, [demo, stopRecognition]);

  const runCloud = useCallback(async (pending: PendingScreenCapture, local: ScreenBillExtraction, generation: number) => {
    if (demo || frozenRef.current) return;
    if (!pending.screenshotUri) {
      setState((current) => ({ ...current, error: '没有可用截图，请重新截图或手动补充', stage: null }));
      return;
    }
    if (!statusRef.current?.imageExportSupported) {
      setState((current) => ({ ...current, error: '请安装新版声账以使用截图云端识别', stage: null }));
      return;
    }
    const consent = await getScreenCloudConsent();
    if (generation !== generationRef.current || frozenRef.current || !ensureFresh()) return;
    if (!consent) {
      setState((current) => ({ ...current, needsCloudConsent: true, stage: null }));
      return;
    }
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setState((current) => ({ ...current, stage: 'cloud', needsCloudConsent: false, error: null }));
    try {
      const result = await parseScreenImage(pending, categories, controller.signal);
      if (generation !== generationRef.current || frozenRef.current || !ensureFresh()) return;
      const extraction = mergeVisionExtraction(local, result.bill);
      extractionRef.current = extraction;
      setState((current) => ({ ...current, extraction, stage: null, suggestedCategoryId: result.bill.categoryId }));
    } catch (error) {
      if (generation !== generationRef.current || frozenRef.current) return;
      setState((current) => ({ ...current, stage: null, error: error instanceof Error && !/network|fetch|abort|json/i.test(error.message) ? error.message : '云端识别暂时未完成，可重试或直接修改' }));
    }
  }, [categories, demo, ensureFresh]);

  const load = useCallback(async () => {
    const generation = ++generationRef.current;
    frozenRef.current = false;
    controllerRef.current?.abort();
    busyRef.current = false;
    pendingRef.current = null;
    setState({ ...initial });
    try {
      const [status, pending] = demo
        ? [demoStatus, createDemoCapture()]
        : await Promise.all([getScreenCaptureStatus(), getPendingCapture()]);
      if (generation !== generationRef.current) return;
      statusRef.current = status;
      pendingRef.current = pending;
      if (pending && !ensureFresh()) {
        setState((current) => ({ ...current, status, loading: false }));
        return;
      }
      const extraction = pending ? demo
        ? extractScreenBill({ text: pending.rawText, now: pending.createdAt, sourceApp: pending.sourceApp })
        : createCloudCaptureDraft(pending.createdAt) : null;
      extractionRef.current = extraction;
      setState({ status, pending, extraction, loading: false, stage: null, needsCloudConsent: false, error: null, suggestedCategoryId: null, expired: false });
      if (pending && extraction) {
        busyRef.current = true;
        try {
          await runCloud(pending, extraction, generation);
        } finally { if (generation === generationRef.current) busyRef.current = false; }
      }
    } catch {
      if (generation === generationRef.current) setState((current) => ({ ...current, loading: false, error: '无法读取这次截图，请重新触发快捷记账' }));
    }
  }, [demo, ensureFresh, runCloud]);

  useEffect(() => {
    if (demo || !state.pending) return;
    const timer = setTimeout(ensureFresh, Math.max(0, captureExpiresAt(state.pending) - Date.now()));
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') ensureFresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [demo, state.pending, ensureFresh]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => { void load(); });
    return () => {
      cancelAnimationFrame(frame);
      generationRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load, captureId]);

  const recognizeCloud = useCallback(async () => {
    const pending = pendingRef.current;
    const local = extractionRef.current;
    if (!pending || !local || busyRef.current || !ensureFresh()) return;
    busyRef.current = true;
    frozenRef.current = false;
    try { await runCloud(pending, createCloudCaptureDraft(pending.createdAt), generationRef.current); } finally { busyRef.current = false; }
  }, [runCloud, ensureFresh]);

  const discard = useCallback(async () => {
    stopRecognition();
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending && !demo) await clearCapture(pending.captureId);
  }, [demo, stopRecognition]);

  const base = state.status && !state.loading ? buildScreenCaptureViewState(state.status, state.pending, state.pending?.createdAt ?? new Date().toISOString()) : null;
  const viewState = base?.kind === 'ready' && state.extraction ? { ...base, extraction: state.extraction } : base;
  return { ...state, viewState, screenshotUri: state.pending?.screenshotUri ?? null, recognizing: state.stage !== null, isDemo: demo, reload: load, recognizeCloud, stopRecognition, ensureFresh, discard };
}
