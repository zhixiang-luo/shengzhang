import { describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';

const updatePolicy = {
  android: {
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.4',
    downloadUrl:
      'https://bigai.xin/shengzhang/downloads/shengzhang-android-preview.apk?download=latest',
  },
  ios: {
    latestVersion: '0.1.5',
    minimumSupportedVersion: '0.1.4',
    downloadUrl: null,
  },
};

describe('app update policy', () => {
  it('requires an unsupported native version to be reinstalled', async () => {
    const app = buildApp({}, { appUpdatePolicy: updatePolicy });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/app/update-policy?platform=android&currentVersion=0.1.3',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      updateType: 'required',
      latestVersion: '0.1.5',
      minimumSupportedVersion: '0.1.4',
      downloadUrl: updatePolicy.android.downloadUrl,
    });
    await app.close();
  });

  it('offers a newer native version without blocking supported clients', async () => {
    const app = buildApp({}, { appUpdatePolicy: updatePolicy });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/app/update-policy?platform=android&currentVersion=0.1.4',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      updateType: 'optional',
      currentVersion: '0.1.4',
      latestVersion: '0.1.5',
    });
    await app.close();
  });

  it('does not prompt clients already on the latest version', async () => {
    const app = buildApp({}, { appUpdatePolicy: updatePolicy });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/app/update-policy?platform=android&currentVersion=0.1.5',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ updateType: 'none' });
    await app.close();
  });

  it('rejects malformed client versions', async () => {
    const app = buildApp({}, { appUpdatePolicy: updatePolicy });
    const response = await app.inject({
      method: 'GET',
      url: '/v1/app/update-policy?platform=android&currentVersion=latest',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: { code: 'INVALID_APP_UPDATE_REQUEST' },
    });
    await app.close();
  });
});
