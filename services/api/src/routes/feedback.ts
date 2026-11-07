import { feedbackSubmissionSchema } from '@shengzhang/contracts';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';

import {
  toFeedbackResponse,
  type FeedbackStore,
} from '../feedback/feedback-store.js';
import { resolveClientIp } from '../security/client-ip.js';
import { InMemoryFixedWindowRateLimiter } from '../security/rate-limit.js';
import { shanghaiDateKey } from '../security/voice-quota.js';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function rateLimited(reply: FastifyReply, retryAfterSeconds: number) {
  reply.header('Retry-After', String(retryAfterSeconds));
  return reply.code(429).send({
    error: {
      code: 'FEEDBACK_RATE_LIMITED',
      message: '反馈提交太频繁，请稍后再试。',
    },
  });
}

export const feedbackRoutes: FastifyPluginAsync<{
  store: FeedbackStore;
  limiter: InMemoryFixedWindowRateLimiter;
}> = async (app, options) => {
  app.post('/v1/feedback', { bodyLimit: 16 * 1024 }, async (request, reply) => {
    const ip = resolveClientIp(request.raw);
    const now = Date.now();
    const checks = [
      options.limiter.consume(
        `feedback:ip-window:${ip}`,
        { limit: 5, windowMs: 10 * MINUTE_MS },
        now,
      ),
      options.limiter.consume(
        `feedback:ip-day:${shanghaiDateKey(new Date(now))}:${ip}`,
        { limit: 30, windowMs: DAY_MS },
        now,
      ),
      options.limiter.consume(
        `feedback:global-day:${shanghaiDateKey(new Date(now))}`,
        { limit: 500, windowMs: DAY_MS },
        now,
      ),
    ];
    const limited = checks.find((check) => !check.allowed);
    if (limited) return rateLimited(reply, limited.retryAfterSeconds);

    const parsed = feedbackSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_FEEDBACK',
          message: '反馈内容格式不正确，请检查后再试。',
        },
      });
    }

    try {
      const record = await options.store.record(parsed.data);
      return reply.code(202).send(toFeedbackResponse(record));
    } catch (error) {
      request.log.error({ err: error }, 'Feedback write failed');
      return reply.code(503).send({
        error: {
          code: 'FEEDBACK_UNAVAILABLE',
          message: '反馈暂时没有发送成功，请稍后重试。',
        },
      });
    }
  });
};
