import { createHash } from 'node:crypto';

import { screenBillRequestSchema, screenBillResponseSchema } from '@shengzhang/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ScreenVisionProvider } from '../providers/screen-vision.js';
import { resolveClientIp } from '../security/client-ip.js';
import { InMemoryFixedWindowRateLimiter } from '../security/rate-limit.js';

const VISION_FIELDS = new Set([
  'documentType', 'paymentStatus', 'transactionKind', 'currency', 'amountText',
  'amountEvidence', 'merchant', 'item', 'categoryId', 'occurredAt', 'timeEvidence',
]);
const SAFE_ERROR_NAMES = new Set(['Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError']);

function safeIssuePath(path: PropertyKey[]): (string | number)[] {
  return path.slice(0, 8).map((part) => {
    if (typeof part === 'number') return part;
    return typeof part === 'string' && VISION_FIELDS.has(part) ? part : '[unknown]';
  });
}

function screenVisionFailure(error: unknown) {
  if (error instanceof ZodError) {
    return {
      type: 'validation',
      issueCount: error.issues.length,
      issues: error.issues.slice(0, 8).map((issue) => ({
        code: issue.code,
        path: safeIssuePath(issue.path),
      })),
    };
  }
  if (error instanceof Error) {
    const code = /^SCREEN_VISION_(?:HTTP_\d{3}|INVALID_RESPONSE)$/.exec(error.message)?.[0];
    return {
      type: 'provider',
      name: SAFE_ERROR_NAMES.has(error.name) ? error.name : 'Error',
      ...(code ? { code } : {}),
    };
  }
  return { type: 'unexpected' };
}

function validImage(base64: string, mimeType: string): boolean {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > 2_000_000 || bytes.length < 24) return false;
  let width = 0;
  let height = 0;
  if (mimeType === 'image/png') {
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString('ascii', 12, 16) !== 'IHDR') return false;
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) return false;
      const marker = bytes[offset + 1]!;
      if (marker === 0xda || marker === 0xd9) break;
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) return false;
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        height = bytes.readUInt16BE(offset + 5);
        width = bytes.readUInt16BE(offset + 7);
        break;
      }
      offset += length + 2;
    }
  }
  return width > 0 && height > 0 && width <= 4096 && height <= 4096 && width * height <= 6_000_000;
}

export const screenBillRoutes: FastifyPluginAsync<{
  provider: ScreenVisionProvider | null;
  dailyLimit: number;
  globalDailyLimit: number;
  minuteLimit: number;
}> = async (app, options) => {
  const limiter = new InMemoryFixedWindowRateLimiter();
  let active = 0;
  app.post('/v1/screen-bill/parse', { bodyLimit: 2_850_000 }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const fail = (status: number, code: string, message: string) => reply.code(status).send({ error: { code, message } });
    const ip = resolveClientIp(request.raw);
    if (!limiter.consume(`screen:ip:${ip}`, { limit: options.minuteLimit, windowMs: 60_000 }).allowed) return fail(429, 'SCREEN_VISION_LIMITED', '识别次数较多，请稍后再试');
    if (!options.provider) return fail(503, 'SCREEN_VISION_DISABLED', '云端识别尚未启用，可继续本地识别或手动补充');
    const parsed = screenBillRequestSchema.safeParse(request.body);
    if (!parsed.success) return fail(400, 'SCREEN_BILL_INVALID', '图片或记账信息格式不正确');
    const input = parsed.data;
    if (!validImage(input.image.base64, input.image.mimeType)) return fail(400, 'SCREEN_IMAGE_INVALID', '图片无法读取或尺寸过大，请重新截图');
    const id = createHash('sha256').update(input.installationId).digest('hex');
    const date = new Date().toISOString().slice(0, 10);
    if (!limiter.consume(`screen:day:${date}:${id}`, { limit: options.dailyLimit, windowMs: 86_400_000 }).allowed || !limiter.consume(`screen:global:${date}`, { limit: options.globalDailyLimit, windowMs: 86_400_000 }).allowed) return fail(429, 'SCREEN_VISION_LIMITED', '云端识别次数暂时受限，可直接手动填写金额和分类后保存');
    if (active >= 8) return fail(429, 'SCREEN_VISION_BUSY', '识别服务忙，请稍后再试');
    active += 1;
    const started = performance.now();
    const controller = new AbortController();
    const onDisconnect = () => { if (!reply.raw.writableEnded) controller.abort(); };
    reply.raw.on('close', onDisconnect);
    try {
      const bill = await options.provider.parse(input, controller.signal);
      const result = screenBillResponseSchema.parse({ captureId: input.captureId, bill, latencyMs: Math.round(performance.now() - started) });
      // Older clients use a strict bill schema. Negotiate additive diagnostics
      // outside the request body so new clients still work against an old server.
      if (request.headers['x-screen-bill-diagnostics'] !== '1') delete result.bill.amountIssue;
      return result;
    } catch (error) {
      // Only finite error codes and known field names may enter normal logs.
      request.log.warn({ screenVisionFailure: screenVisionFailure(error) }, 'Screen vision parse failed');
      return fail(503, 'SCREEN_VISION_UNAVAILABLE', '云端识别暂时未完成，可以重试或直接修改账单');
    } finally {
      reply.raw.off('close', onDisconnect);
      active -= 1;
    }
  });
};
