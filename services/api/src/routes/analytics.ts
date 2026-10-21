import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  ANALYTICS_EVENT_NAMES,
  type AnalyticsEventStore,
} from '../analytics/event-store.js';
import { resolveClientIp } from '../security/client-ip.js';
import { InMemoryFixedWindowRateLimiter } from '../security/rate-limit.js';
import { shanghaiDateKey } from '../security/voice-quota.js';

const propertiesSchema = z
  .object({
    platform: z.enum(['android', 'ios', 'web']).optional(),
    appVersion: z.string().max(32).optional(),
    entryCount: z.number().int().min(0).max(5).optional(),
    durationMs: z.number().int().min(0).max(120_000).optional(),
    reason: z
      .enum([
        'cancelled',
        'permission',
        'connection',
        'timeout',
        'empty',
        'too_short',
        'provider',
        'save_failed',
        'unknown',
      ])
      .optional(),
    source: z.enum(['official_site']).optional(),
  })
  .strict();

const eventsSchema = z.object({
  anonymousId: z.string().min(16).max(200),
  events: z
    .array(
      z.object({
        name: z.enum(ANALYTICS_EVENT_NAMES),
        occurredAt: z
          .string()
          .max(40)
          .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid event time'),
        properties: propertiesSchema.default({}),
      }),
    )
    .min(1)
    .max(20),
});

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const analyticsRoutes: FastifyPluginAsync<{
  enabled: boolean;
  store: AnalyticsEventStore;
  limiter: InMemoryFixedWindowRateLimiter;
}> = async (app, options) => {
  const reject = (reply: FastifyReply, retryAfterSeconds: number) => {
    reply.header('Retry-After', String(retryAfterSeconds));
    return reply.code(429).send({
      error: {
        code: 'ANALYTICS_RATE_LIMITED',
        message: '统计请求太频繁。',
      },
    });
  };

  app.post(
    '/v1/analytics/events',
    { bodyLimit: 32 * 1024 },
    async (request, reply) => {
      if (!options.enabled) return reply.code(204).send();

      const ip = resolveClientIp(request.raw);
      const now = Date.now();
      const minute = options.limiter.consume(
        `analytics:ip-minute:${ip}`,
        { limit: 60, windowMs: MINUTE_MS },
        now,
      );
      if (!minute.allowed) return reject(reply, minute.retryAfterSeconds);
      const day = options.limiter.consume(
        `analytics:ip-day:${shanghaiDateKey(new Date(now))}:${ip}`,
        { limit: 3000, windowMs: DAY_MS },
        now,
      );
      if (!day.allowed) return reject(reply, day.retryAfterSeconds);

      const parsed = eventsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_ANALYTICS_EVENT',
            message: '统计事件格式不正确。',
          },
        });
      }

      try {
        await options.store.record(parsed.data.anonymousId, parsed.data.events);
        return reply.code(202).send({ accepted: parsed.data.events.length });
      } catch (error) {
        request.log.error({ err: error }, 'Analytics event write failed');
        return reply.code(503).send({
          error: {
            code: 'ANALYTICS_UNAVAILABLE',
            message: '统计暂不可用。',
          },
        });
      }
    },
  );
};
