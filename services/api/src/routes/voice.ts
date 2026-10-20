import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { VoiceProvider } from '../providers/voice.js';
import type { VoiceQuota } from '../security/voice-quota.js';

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['expense', 'income']),
  children: z.array(z.string()),
});

export const voiceRoutes: FastifyPluginAsync<{
  provider: VoiceProvider;
  quota: VoiceQuota;
}> = async (app, options) => {
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

    const result = await options.provider.parse({
      audio,
      mimeType: data.mimetype,
      timezone,
      categories,
    });

    return {
      requestId: randomUUID(),
      transcript: result.transcript,
      entries: result.entries,
      unresolvedFields: result.unresolvedFields,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  });
};
