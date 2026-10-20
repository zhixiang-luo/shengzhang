import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { loadEnvironment } from './config.js';
import { createVoiceProvider } from './providers/factory.js';
import { healthRoutes } from './routes/health.js';
import { voiceRoutes } from './routes/voice.js';
import { InMemoryDailyVoiceQuota } from './security/voice-quota.js';

export function buildApp(options: FastifyServerOptions = {}) {
  const environment = loadEnvironment();
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          '*.audio',
          '*.transcript',
          '*.note',
          '*.token',
          '*.refreshToken',
        ],
        censor: '[REDACTED]',
      },
    },
    ...options,
  });

  app.register(cors, { origin: false });
  app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024,
      fields: 20,
    },
  });

  app.register(healthRoutes);
  app.register(voiceRoutes, {
    provider: createVoiceProvider(environment),
    quota: new InMemoryDailyVoiceQuota(environment.VOICE_DAILY_LIMIT),
    partialQuota: new InMemoryDailyVoiceQuota(environment.VOICE_PARTIAL_DAILY_LIMIT),
  });

  return app;
}
