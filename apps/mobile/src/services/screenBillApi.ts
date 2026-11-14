import { screenBillRequestSchema, screenBillResponseSchema, type ScreenBillResponse } from '@shengzhang/contracts';
import { prepareCaptureImage, setScreenOverlayCloudEnabled, type PendingScreenCapture } from '@shengzhang/screen-capture';
import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL } from '../config/env';
import type { CategoryRow } from '../db/categoryRepository';
import { getInstallationId } from './installationId';

const CLOUD_KEY = 'screen-capture-cloud-consent-v1';
let cloudOperations: Promise<unknown> = Promise.resolve();
let cloudRevoked = false;
let consentRevision = 0;
const activeUploads = new Set<AbortController>();

export function serializeScreenCloudConfiguration<T>(operation: () => Promise<T>): Promise<T> {
  const pending = cloudOperations.then(operation);
  cloudOperations = pending.catch(() => undefined);
  return pending;
}
export async function getScreenCloudConsent(): Promise<boolean> {
  if (cloudRevoked) return false;
  const enabled = (await SecureStore.getItemAsync(CLOUD_KEY)) === 'enabled';
  return enabled && !cloudRevoked;
}
export async function setScreenCloudConsent(enabled: boolean): Promise<void> {
  const revision = ++consentRevision;
  // Revocation takes effect for JS uploads immediately, including while an
  // earlier native configuration is still queued. A late enable cannot undo it.
  if (!enabled) {
    cloudRevoked = true;
    for (const controller of activeUploads) controller.abort();
  }
  return serializeScreenCloudConfiguration(async () => {
    if (!enabled) {
      // Stop the native task first; always revoke JS upload access as well even
      // when the native bridge reports an error.
      try { await setScreenOverlayCloudEnabled(false); }
      finally { await SecureStore.setItemAsync(CLOUD_KEY, 'disabled'); }
      return;
    }
    await SecureStore.setItemAsync(CLOUD_KEY, 'enabled');
    try {
      await setScreenOverlayCloudEnabled(true);
      if (revision === consentRevision) cloudRevoked = false;
    }
    catch (error) {
      await SecureStore.setItemAsync(CLOUD_KEY, 'disabled');
      throw error;
    }
  });
}

export async function parseScreenImage(pending: PendingScreenCapture, categories: CategoryRow[], signal: AbortSignal): Promise<ScreenBillResponse> {
  const revision = consentRevision;
  if (!await getScreenCloudConsent()) throw new Error('请先同意本次截图的云端识别');
  if (signal.aborted || revision !== consentRevision) throw new Error('识别已取消');
  const image = await prepareCaptureImage(pending.captureId);
  const payload = screenBillRequestSchema.parse({
    installationId: await getInstallationId(),
    captureId: pending.captureId,
    consent: true,
    capturedAt: pending.createdAt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
    image,
    categories: categories.filter((item) => !item.isArchived).slice(0, 160).map((item) => ({ id: item.id, name: item.name, type: item.type })),
  });
  if (!await getScreenCloudConsent()) throw new Error('云端识别已关闭');
  if (signal.aborted || revision !== consentRevision) throw new Error('识别已取消');
  const timeout = new AbortController();
  activeUploads.add(timeout);
  const onAbort = () => timeout.abort();
  signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => timeout.abort(), 20_000);
  try {
    const response = await fetch(`${API_BASE_URL}/v1/screen-bill/parse`, {
      method: 'POST', signal: timeout.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Screen-Bill-Diagnostics': '1' },
      body: JSON.stringify(payload),
    });
    const result: unknown = await response.json();
    if (timeout.signal.aborted || !await getScreenCloudConsent() || revision !== consentRevision) throw new Error('云端识别已取消');
    if (!response.ok) {
      const error = result as { error?: { message?: string } };
      throw new Error(error.error?.message ?? '云端识别暂时不可用，请手动补充');
    }
    const parsed = screenBillResponseSchema.parse(result);
    if (parsed.captureId !== pending.captureId) throw new Error('识别结果已失效，请重新识别');
    return parsed;
  } finally {
    activeUploads.delete(timeout);
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}
