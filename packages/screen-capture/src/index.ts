import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type ScreenCaptureSourceApp = 'wechat' | 'alipay' | 'unknown';

export interface ScreenCaptureStatus {
  supported: boolean;
  platform: 'android' | 'ios' | 'web';
  androidApi: number;
  accessibilityEnabled: boolean;
  accessibilityConnected?: boolean;
  tileSupported: boolean;
  /** null/absent means this installation has not received a system confirmation yet. */
  tileAdded?: boolean | null;
  autoAddTileSupported: boolean;
  reason: string | null;
  imageExportSupported?: boolean;
  overlaySupported?: boolean;
  floatingButtonEnabled?: boolean;
  overlayCloudEnabled?: boolean;
  lastCaptureMessage?: string | null;
  lastCaptureCode?: string | null;
}

export interface ScreenOverlayConfiguration {
  apiBaseUrl: string;
  databasePath: string;
  installationId: string;
  cloudEnabled: boolean;
}

export interface PendingScreenCapture {
  captureId: string;
  createdAt: string;
  sourceApp: ScreenCaptureSourceApp;
  rawText: string;
  screenshotUri: string | null;
  captureMethod: 'accessibility' | 'screenshot' | 'shared_image';
}

export interface CaptureImage {
  mimeType: 'image/jpeg';
  base64: string;
}

export interface ScreenCaptureEventSubscription {
  remove(): void;
}

export const SCREEN_BILL_SAVED_EVENT = 'onScreenBillSaved';

interface ScreenCaptureNativeModule {
  getScreenCaptureStatus(): Promise<ScreenCaptureStatus>;
  openAccessibilitySettings(): Promise<void>;
  requestQuickSettingsTile(): Promise<boolean>;
  getPendingCapture(): Promise<PendingScreenCapture | null>;
  recognizeCaptureImage(captureId: string): Promise<string>;
  prepareCaptureImage?(captureId: string): Promise<CaptureImage>;
  clearCapture(captureId: string): Promise<void>;
  openConfirmation(captureId: string): Promise<void>;
  configureScreenOverlay?(configuration: ScreenOverlayConfiguration): Promise<void>;
  setScreenOverlayCloudEnabled?(enabled: boolean): Promise<void>;
  setScreenFloatingButtonEnabled?(enabled: boolean): Promise<void>;
  requestCaptureShortcut?(): Promise<boolean>;
  addListener?(eventName: string, listener: () => void): ScreenCaptureEventSubscription;
}

const nativeModule =
  requireOptionalNativeModule<ScreenCaptureNativeModule>('ScreenCapture');

const unsupportedStatus: ScreenCaptureStatus = {
  supported: false,
  platform: Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web',
  androidApi: 0,
  accessibilityEnabled: false,
  tileSupported: false,
  autoAddTileSupported: false,
  reason: '当前运行环境不包含付款页识别原生模块',
};

export async function getScreenCaptureStatus(): Promise<ScreenCaptureStatus> {
  return nativeModule?.getScreenCaptureStatus() ?? unsupportedStatus;
}

export async function openAccessibilitySettings(): Promise<void> {
  await nativeModule?.openAccessibilitySettings();
}

export async function requestQuickSettingsTile(): Promise<boolean> {
  return nativeModule?.requestQuickSettingsTile() ?? false;
}

export async function getPendingCapture(): Promise<PendingScreenCapture | null> {
  return nativeModule?.getPendingCapture() ?? null;
}

export async function recognizeCaptureImage(captureId: string): Promise<string> {
  return nativeModule?.recognizeCaptureImage(captureId) ?? '';
}

export async function prepareCaptureImage(captureId: string): Promise<CaptureImage> {
  if (!nativeModule?.prepareCaptureImage) throw new Error('请安装新版声账以启用截图云端识别');
  return nativeModule.prepareCaptureImage(captureId);
}

export async function clearCapture(captureId: string): Promise<void> {
  await nativeModule?.clearCapture(captureId);
}

export async function openScreenCaptureConfirmation(captureId: string): Promise<void> {
  await nativeModule?.openConfirmation(captureId);
}

export function isScreenCaptureNativeAvailable(): boolean {
  return nativeModule !== null;
}

export async function configureScreenOverlay(configuration: ScreenOverlayConfiguration): Promise<boolean> {
  if (!nativeModule?.configureScreenOverlay) return false;
  await nativeModule.configureScreenOverlay(configuration);
  return true;
}

export async function setScreenOverlayCloudEnabled(enabled: boolean): Promise<void> {
  await nativeModule?.setScreenOverlayCloudEnabled?.(enabled);
}

export async function setScreenFloatingButtonEnabled(enabled: boolean): Promise<void> {
  if (!nativeModule?.setScreenFloatingButtonEnabled) throw new Error('请安装新版声账以启用原页面悬浮记账');
  await nativeModule.setScreenFloatingButtonEnabled(enabled);
}

export async function requestCaptureShortcut(): Promise<boolean> {
  return nativeModule?.requestCaptureShortcut?.() ?? false;
}

export function addScreenBillSavedListener(listener: () => void): ScreenCaptureEventSubscription {
  return nativeModule?.addListener?.(SCREEN_BILL_SAVED_EVENT, listener) ?? { remove() {} };
}
