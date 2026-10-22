import * as Updates from 'expo-updates';

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
