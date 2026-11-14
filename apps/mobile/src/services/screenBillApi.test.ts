import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getScreenCloudConsent, parseScreenImage, setScreenCloudConsent } from './screenBillApi';

const boundary = vi.hoisted(() => ({
  consent: 'disabled',
  image: vi.fn(),
  fetch: vi.fn(),
  nativeConsent: vi.fn(),
}));
vi.mock('expo-secure-store', () => ({
  getItemAsync: async () => boundary.consent,
  setItemAsync: async (_key: string, value: string) => { boundary.consent = value; },
}));
vi.mock('@shengzhang/screen-capture', () => ({ prepareCaptureImage: boundary.image, setScreenOverlayCloudEnabled: boundary.nativeConsent }));
vi.mock('expo/fetch', () => ({ fetch: boundary.fetch }));
vi.mock('../config/env', () => ({ API_BASE_URL: 'https://api.example' }));
vi.mock('./installationId', () => ({ getInstallationId: async () => 'synthetic-installation' }));

const pending = { captureId: 'synthetic-capture', createdAt: '2026-11-13T01:00:00.000Z', sourceApp: 'unknown' as const, rawText: '', screenshotUri: 'file:///synthetic.png', captureMethod: 'shared_image' as const };
const image = { mimeType: 'image/jpeg', base64: 'aGVsbG8=' };
const bill = { amountMinor: 2658, type: 'expense', merchant: null, item: null, categoryId: null, occurredAt: null, amountEvidence: '实付 ¥26.58', blockingReason: null };
beforeEach(() => {
  boundary.consent = 'disabled';
  boundary.image.mockReset().mockResolvedValue(image);
  boundary.nativeConsent.mockReset().mockResolvedValue(undefined);
  boundary.fetch.mockReset().mockImplementation(async () => new Response(JSON.stringify({ captureId: pending.captureId, latencyMs: 50, bill })));
});

describe('screen image upload privacy boundary', () => {
  it('cancels an active request and ignores a response after cloud is turned off', async () => {
    await setScreenCloudConsent(true);
    let release!: (response: Response) => void;
    let entered!: () => void;
    let requestSignal: AbortSignal | undefined;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    boundary.fetch.mockImplementation(async (_url: string, options: { signal: AbortSignal }) => {
      requestSignal = options.signal;
      entered();
      return new Promise<Response>((resolve) => { release = resolve; });
    });
    const parsing = parseScreenImage(pending, [], new AbortController().signal);
    await started;
    await setScreenCloudConsent(false);
    const canceled = requestSignal?.aborted;
    release(new Response(JSON.stringify({ captureId: pending.captureId, latencyMs: 50, bill })));
    await expect(parsing).rejects.toThrow();
    expect(canceled).toBe(true);
  });

  it('blocks new uploads immediately while native revocation is still pending', async () => {
    await setScreenCloudConsent(true);
    let release!: () => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => { entered = resolve; });
    boundary.nativeConsent.mockImplementation(async () => {
      entered();
      await new Promise<void>((resolve) => { release = resolve; });
    });
    const disabling = setScreenCloudConsent(false);
    await started;
    try {
      await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('请先同意');
      expect(boundary.image).not.toHaveBeenCalled();
      expect(boundary.fetch).not.toHaveBeenCalled();
    } finally {
      release();
      await disabling;
    }
  });

  it('keeps uploads disabled even if the native revocation reports a failure', async () => {
    await setScreenCloudConsent(true);
    boundary.nativeConsent.mockRejectedValue(new Error('native unavailable'));
    await expect(setScreenCloudConsent(false)).rejects.toThrow();
    expect(await getScreenCloudConsent()).toBe(false);
    await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('请先同意');
    expect(boundary.fetch).not.toHaveBeenCalled();
  });

  it('does not leave cloud enabled if the native authorization update fails', async () => {
    boundary.nativeConsent.mockRejectedValue(new Error('native unavailable'));
    await expect(setScreenCloudConsent(true)).rejects.toThrow();
    expect(await getScreenCloudConsent()).toBe(false);
  });

  it('does not export or send a screenshot without consent', async () => {
    await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('请先同意');
    expect(boundary.image).not.toHaveBeenCalled();
    expect(boundary.fetch).not.toHaveBeenCalled();
  });

  it('does not upload if consent is turned off while the image is being prepared', async () => {
    await setScreenCloudConsent(true);
    boundary.image.mockImplementation(async () => { await setScreenCloudConsent(false); return image; });
    await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('已关闭');
    expect(boundary.fetch).not.toHaveBeenCalled();
  });

  it('does not revive an old capture if consent is turned off and on during image preparation', async () => {
    await setScreenCloudConsent(true);
    boundary.image.mockImplementation(async () => {
      await setScreenCloudConsent(false);
      await setScreenCloudConsent(true);
      return image;
    });
    await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('已取消');
    expect(boundary.fetch).not.toHaveBeenCalled();
  });

  it('cancels before sending if the capture closes during image preparation', async () => {
    await setScreenCloudConsent(true);
    const controller = new AbortController();
    boundary.image.mockImplementation(async () => { controller.abort(); return image; });
    await expect(parseScreenImage(pending, [], controller.signal)).rejects.toThrow('已取消');
    expect(boundary.fetch).not.toHaveBeenCalled();
  });

  it('rejects a response associated with a different capture', async () => {
    await setScreenCloudConsent(true);
    boundary.fetch.mockResolvedValue(new Response(JSON.stringify({
      captureId: 'stale-capture', latencyMs: 50,
      bill,
    })));
    await expect(parseScreenImage(pending, [], new AbortController().signal)).rejects.toThrow('已失效');
  });
});
