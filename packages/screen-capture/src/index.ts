import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type ScreenCaptureSourceApp = 'wechat' | 'alipay' | 'unknown';

export interface ScreenCaptureStatus {
  supported: boolean;
  platform: 'android' | 'ios' | 'web';
  androidApi: number;
  accessibilityEnabled: boolean;
  tileSupported: boolean;
  autoAddTileSupported: boolean;
  reason: string | null;
}

export interface PendingScreenCapture {
  captureId: string;
  createdAt: string;
  sourceApp: ScreenCaptureSourceApp;
  rawText: string;
  screenshotUri: string | null;
  captureMethod: 'accessibility' | 'screenshot';
}

interface ScreenCaptureNativeModule {
  getScreenCaptureStatus(): Promise<ScreenCaptureStatus>;
  openAccessibilitySettings(): Promise<void>;
  requestQuickSettingsTile(): Promise<boolean>;
  getPendingCapture(): Promise<PendingScreenCapture | null>;
  recognizeCaptureImage(captureId: string): Promise<string>;
  clearCapture(captureId: string): Promise<void>;
  openConfirmation(captureId: string): Promise<void>;
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

export async function clearCapture(captureId: string): Promise<void> {
  await nativeModule?.clearCapture(captureId);
}

export async function openScreenCaptureConfirmation(captureId: string): Promise<void> {
  await nativeModule?.openConfirmation(captureId);
}

export function isScreenCaptureNativeAvailable(): boolean {
  return nativeModule !== null;
}
