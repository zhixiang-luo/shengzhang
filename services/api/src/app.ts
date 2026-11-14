import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import type { AppUpdatePolicyConfig } from '@shengzhang/contracts';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { AnalyticsEventStore } from './analytics/event-store.js';
import { loadEnvironment } from './config.js';
import { FeedbackStore } from './feedback/feedback-store.js';
import { createVoiceProvider } from './providers/factory.js';
import { OpenAiScreenVisionProvider } from './providers/screen-vision.js';
import { resolveScreenVisionCredentials } from './providers/screen-vision-config.js';
import { screenBillRoutes } from './routes/screen-bill.js';
import { analyticsRoutes } from './routes/analytics.js';
import { appUpdateRoutes } from './routes/app-update.js';
import { feedbackRoutes } from './routes/feedback.js';
import { healthRoutes } from './routes/health.js';
import { voiceRoutes } from './routes/voice.js';
import {
  InMemoryFixedWindowRateLimiter,
  VoiceAccessGuard,
} from './security/rate-limit.js';
import { InMemoryDailyVoiceQuota } from './security/voice-quota.js';

type AppDependencies = {
  voiceAccessGuard?: VoiceAccessGuard;
  appUpdatePolicy?: AppUpdatePolicyConfig;
};

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
) {
  const environment = loadEnvironment();
  const screenVision = resolveScreenVisionCredentials(environment);
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
          '*.image',
          '*.base64',
          '*.bill',
          '*.amountEvidence',
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
  app.register(screenBillRoutes, {
    provider: environment.SCREEN_VISION_ENABLED && screenVision.apiKey
      ? new OpenAiScreenVisionProvider({
          apiKey: screenVision.apiKey,
          baseUrl: environment.SCREEN_VISION_BASE_URL,
          model: environment.SCREEN_VISION_MODEL,
          thinking: screenVision.thinking,
        })
      : null,
    dailyLimit: environment.SCREEN_VISION_DAILY_LIMIT,
    globalDailyLimit: environment.SCREEN_VISION_GLOBAL_DAILY_LIMIT,
    minuteLimit: environment.SCREEN_VISION_IP_MINUTE_LIMIT,
  });
  app.register(appUpdateRoutes, {
    policy:
      dependencies.appUpdatePolicy ?? {
        android: {
          latestVersion: environment.APP_UPDATE_ANDROID_LATEST_VERSION,
          minimumSupportedVersion: environment.APP_UPDATE_ANDROID_MINIMUM_VERSION,
          downloadUrl: environment.APP_UPDATE_ANDROID_DOWNLOAD_URL,
        },
        ios: {
          latestVersion: environment.APP_UPDATE_IOS_LATEST_VERSION,
          minimumSupportedVersion: environment.APP_UPDATE_IOS_MINIMUM_VERSION,
          downloadUrl: environment.APP_UPDATE_IOS_DOWNLOAD_URL ?? null,
        },
      },
  });
  app.register(analyticsRoutes, {
    enabled: environment.ANALYTICS_ENABLED,
    store: new AnalyticsEventStore({
      directory: environment.ANALYTICS_DATA_DIR,
      hashSalt: environment.ANALYTICS_HASH_SALT ?? 'development-only-analytics-salt',
    }),
    limiter: new InMemoryFixedWindowRateLimiter(),
  });
  app.register(feedbackRoutes, {
    store: new FeedbackStore({
      directory: environment.FEEDBACK_DATA_DIR,
      hashSalt: environment.FEEDBACK_HASH_SALT ?? 'development-only-feedback-salt',
    }),
    limiter: new InMemoryFixedWindowRateLimiter(),
  });
  app.register(voiceRoutes, {
    provider: createVoiceProvider(environment),
    quota: new InMemoryDailyVoiceQuota(environment.VOICE_DAILY_LIMIT),
    partialQuota: new InMemoryDailyVoiceQuota(environment.VOICE_PARTIAL_DAILY_LIMIT),
    accessGuard: voiceAccessGuard,
  });

  return app;
}
