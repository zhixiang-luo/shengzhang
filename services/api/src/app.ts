import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { loadEnvironment } from './config.js';
import { createVoiceProvider } from './providers/factory.js';
import { healthRoutes } from './routes/health.js';
import { voiceRoutes } from './routes/voice.js';
import {
  InMemoryFixedWindowRateLimiter,
  VoiceAccessGuard,
} from './security/rate-limit.js';
import { InMemoryDailyVoiceQuota } from './security/voice-quota.js';

type AppDependencies = {
  voiceAccessGuard?: VoiceAccessGuard;
};

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
) {
  const environment = loadEnvironment();
  const voiceAccessGuard =
    dependencies.voiceAccessGuard ??
    new VoiceAccessGuard(new InMemoryFixedWindowRateLimiter(), {
      ipMinuteLimit: environment.VOICE_IP_MINUTE_LIMIT,
      ipDailyLimit: environment.VOICE_IP_DAILY_LIMIT,
      globalMinuteLimit: environment.VOICE_GLOBAL_MINUTE_LIMIT,
      globalDailyLimit: environment.VOICE_GLOBAL_DAILY_LIMIT,
    });
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
    accessGuard: voiceAccessGuard,
  });

  return app;
}
