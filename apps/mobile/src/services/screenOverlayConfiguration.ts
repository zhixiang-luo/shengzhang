import { configureScreenOverlay } from '@shengzhang/screen-capture';

import { API_BASE_URL } from '../config/env';
import { getInstallationId } from './installationId';
import { getScreenCloudConsent, serializeScreenCloudConfiguration } from './screenBillApi';

export async function synchronizeScreenOverlay(databasePath: string): Promise<boolean> {
  return serializeScreenCloudConfiguration(async () => configureScreenOverlay({
    apiBaseUrl: API_BASE_URL,
    databasePath,
    installationId: await getInstallationId(),
    cloudEnabled: await getScreenCloudConsent(),
  }));
}
