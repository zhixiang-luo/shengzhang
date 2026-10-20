import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { VoiceProvider } from '../providers/voice.js';
import type { VoiceQuota } from '../security/voice-quota.js';

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['expense', 'income']),
  children: z.array(z.string()),
});

const parseTranscriptSchema = z.object({
  installationId: z.string().min(1).max(200),
  transcript: z.string().trim().min(1).max(2000),
  timezone: z.string().min(1).max(100).default('Asia/Shanghai'),
  categories: z.array(categorySchema).max(80),
});

export const voiceRoutes: FastifyPluginAsync<{
  provider: VoiceProvider;
  quota: VoiceQuota;
  partialQuota: VoiceQuota;
}> = async (app, options) => {
  const providerError = (reply: FastifyReply, error: unknown) => {
    const providerMessage = error instanceof Error ? error.message : '';
    if (error instanceof DOMException && error.name === 'AbortError') {
      return reply.code(503).send({
        error: {
          code: 'VOICE_PROVIDER_TIMEOUT',
          message: '语音服务响应超时，请再说一次。',
        },
      });
    }
    if (providerMessage.includes('ASR_REQUEST_FAILED_402')) {
      return reply.code(503).send({
        error: {
          code: 'VOICE_PROVIDER_BALANCE',
          message: '语音识别额度不足，请联系管理员充值。',
        },
      });
    }
    return reply.code(503).send({
      error: {
        code: 'VOICE_PROVIDER_UNAVAILABLE',
        message: '语音服务暂时不可用，请稍后重试。',
      },
    });
  };

  app.post('/v1/voice/transcribe', async (request, reply) => {
    const startedAt = performance.now();
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({
        error: { code: 'AUDIO_REQUIRED', message: '缺少语音文件。' },
      });
    }
    const audio = await data.toBuffer();
    if (audio.byteLength === 0) {
      return reply.code(400).send({
        error: { code: 'AUDIO_EMPTY', message: '语音文件为空。' },
      });
    }
    const installationField = data.fields.installationId;
    const installationValue = Array.isArray(installationField)
      ? installationField[0]
      : installationField;
    const installationId =
      installationValue &&
      typeof installationValue === 'object' &&
      'value' in installationValue &&
      typeof installationValue.value === 'string'
        ? installationValue.value
        : null;
    if (!installationId) {
      return reply.code(400).send({
        error: { code: 'INSTALLATION_ID_REQUIRED', message: '缺少安装标识。' },
      });
    }
    if (!options.partialQuota.consume(installationId)) {
      return reply.code(429).send({
        error: {
          code: 'VOICE_PARTIAL_RATE_LIMITED',
          message: '实时字幕请求太频繁，请稍后再试。',
        },
      });
    }
    try {
      const transcript = await options.provider.transcribe({
        audio,
        mimeType: data.mimetype,
      });
      return {
        transcript,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      request.log.error({ err: error }, 'Voice partial transcription failed');
      return providerError(reply, error);
    }
  });

  app.post('/v1/voice/parse-transcript', async (request, reply) => {
    const startedAt = performance.now();
    const parsedBody = parseTranscriptSchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_TRANSCRIPT',
          message: '语音文字格式不正确，请再说一次。',
        },
      });
    }
    const input = parsedBody.data;
    if (!options.quota.consume(input.installationId)) {
      return reply.code(429).send({
        error: {
          code: 'VOICE_RATE_LIMITED',
          message: '今天的语音次数用完了，明天再试。',
        },
      });
    }
    try {
      const result = await options.provider.parseTranscript(input);
      return {
        requestId: randomUUID(),
        transcript: result.transcript,
        entries: result.entries,
        unresolvedFields: result.unresolvedFields,
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      request.log.error({ err: error }, 'Voice transcript parsing failed');
      return providerError(reply, error);
    }
  });

  app.post('/v1/voice/parse', async (request, reply) => {
    const startedAt = performance.now();
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({
        error: { code: 'AUDIO_REQUIRED', message: '缺少语音文件。' },
      });
    }

    const audio = await data.toBuffer();
    if (audio.byteLength === 0) {
      return reply.code(400).send({
        error: { code: 'AUDIO_EMPTY', message: '语音文件为空。' },
      });
    }

    const timezoneField = data.fields.timezone;
    const timezoneValue = Array.isArray(timezoneField) ? timezoneField[0] : timezoneField;
    const timezone =
      timezoneValue && typeof timezoneValue === 'object' && 'value' in timezoneValue && typeof timezoneValue.value === 'string'
        ? timezoneValue.value
        : 'Asia/Shanghai';
    const installationField = data.fields.installationId;
    const installationValue = Array.isArray(installationField)
      ? installationField[0]
      : installationField;
    const installationId =
      installationValue &&
      typeof installationValue === 'object' &&
      'value' in installationValue &&
      typeof installationValue.value === 'string'
        ? installationValue.value
        : null;
    if (!installationId) {
      return reply.code(400).send({
        error: { code: 'INSTALLATION_ID_REQUIRED', message: '缺少安装标识。' },
      });
    }
    if (!options.quota.consume(installationId)) {
      return reply.code(429).send({
        error: {
          code: 'VOICE_RATE_LIMITED',
          message: '今天的语音次数用完了，明天再试。',
        },
      });
    }

    const categoryField = data.fields.categoryTree;
    const categoryValue = Array.isArray(categoryField) ? categoryField[0] : categoryField;
    const categoryJson =
      categoryValue &&
      typeof categoryValue === 'object' &&
      'value' in categoryValue &&
      typeof categoryValue.value === 'string'
        ? categoryValue.value
        : '[]';
    const categories = z.array(categorySchema).parse(JSON.parse(categoryJson));

    let result: Awaited<ReturnType<VoiceProvider['parse']>>;
    try {
      result = await options.provider.parse({
        audio,
        mimeType: data.mimetype,
        timezone,
        categories,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Voice provider request failed');
      return providerError(reply, error);
    }

    return {
      requestId: randomUUID(),
      transcript: result.transcript,
      entries: result.entries,
      unresolvedFields: result.unresolvedFields,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  });
};
