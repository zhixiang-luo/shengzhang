import {
  appUpdatePolicyResponseSchema,
  type AppUpdatePolicyResponse,
} from '@shengzhang/contracts';
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../config/env';
export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'downloading'
  | 'ready'
  | 'up-to-date'
  | 'unsupported'
  | 'error';

export async function checkForAppUpdate(): Promise<{
  status: AppUpdateStatus;
  message?: string;
}> {
  if (!Updates.isEnabled) {
    return {
      status: 'unsupported',
      message: 'Expo Go 会直接加载开发服务器，不支持应用内更新。',
    };
  }
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) {
    return { status: 'up-to-date' };
  }
  await Updates.fetchUpdateAsync();
  return { status: 'ready' };
}

export async function applyAppUpdate() {
  if (!Updates.isEnabled) {
    throw new Error('当前运行方式不支持应用内更新。');
  }
  await Updates.reloadAsync();
}

export function getAppUpdateInfo() {
  return {
    enabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt?.toISOString() ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

export async function checkNativeAppUpdate(): Promise<AppUpdatePolicyResponse | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const query = new URLSearchParams({
      platform: Platform.OS,
      currentVersion,
    });
    const response = await fetch(`${API_BASE_URL}/v1/app/update-policy?${query}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(`Native update policy request failed: ${response.status}`);
    }
    return appUpdatePolicyResponseSchema.parse(payload);
  } finally {
    clearTimeout(timeout);
  }
}
