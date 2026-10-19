import { randomUUID } from 'node:crypto';

import type { FastifyPluginAsync } from 'fastify';

import { MockVoiceProvider } from '../providers/mock-voice-provider.js';

export const voiceRoutes: FastifyPluginAsync = async (app) => {
  const provider = new MockVoiceProvider();

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

    const result = await provider.parse({
      audio,
      mimeType: data.mimetype,
      timezone,
      categoryNames: [],
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
