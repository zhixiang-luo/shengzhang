import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { healthRoutes } from './routes/health.js';
import { voiceRoutes } from './routes/voice.js';

export function buildApp(options: FastifyServerOptions = {}) {
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
  app.register(voiceRoutes);

  return app;
}
