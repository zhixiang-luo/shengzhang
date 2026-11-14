import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getScreenCloudConsent, setScreenCloudConsent } from './screenBillApi';
import { synchronizeScreenOverlay } from './screenOverlayConfiguration';

const boundary = vi.hoisted(() => ({ stored: 'disabled', configure: vi.fn(), nativeConsent: vi.fn(), image: vi.fn() }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => boundary.stored,
  setItemAsync: async (_key: string, value: string) => { boundary.stored = value; },
}));
vi.mock('@shengzhang/screen-capture', () => ({ configureScreenOverlay: boundary.configure, setScreenOverlayCloudEnabled: boundary.nativeConsent, prepareCaptureImage: boundary.image }));
vi.mock('expo/fetch', () => ({ fetch: vi.fn() }));
vi.mock('../config/env', () => ({ API_BASE_URL: 'https://api.example' }));
vi.mock('./installationId', () => ({ getInstallationId: async () => 'synthetic-installation' }));

beforeEach(() => {
  boundary.stored = 'disabled';
  boundary.configure.mockReset().mockResolvedValue(true);
  boundary.nativeConsent.mockReset().mockResolvedValue(undefined);
});

describe('overlay configuration and revocation', () => {
  it('passes the already migrated SQLite path and current consent to the native service', async () => {
    await synchronizeScreenOverlay('/private-test/files/SQLite/shengzhang.db');
    expect(boundary.configure).toHaveBeenCalledWith({ apiBaseUrl: 'https://api.example', databasePath: '/private-test/files/SQLite/shengzhang.db', installationId: 'synthetic-installation', cloudEnabled: false });
  });
  it('serializes a foreground configuration refresh before a later revocation', async () => {
    await setScreenCloudConsent(true);
    let release!: (value: boolean) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    let nativeEnabled = true;
    boundary.configure.mockImplementation(async (input: { cloudEnabled: boolean }) => {
      entered();
      await new Promise<boolean>((resolve) => { release = resolve; });
      nativeEnabled = input.cloudEnabled;
      return true;
    });
    boundary.nativeConsent.mockImplementation(async (enabled: boolean) => { nativeEnabled = enabled; });
    const refreshing = synchronizeScreenOverlay('/private-test/files/SQLite/shengzhang.db');
    await started;
    const disabling = setScreenCloudConsent(false);
    const consentDuringRefresh = await getScreenCloudConsent();
    release(true);
    await Promise.all([refreshing, disabling]);
    expect(consentDuringRefresh).toBe(false);
    expect(nativeEnabled).toBe(false);
    expect(boundary.stored).toBe('disabled');
  });
});
