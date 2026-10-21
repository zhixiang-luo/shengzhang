import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),
  VOICE_PROVIDER: z.enum(['mock', 'cloud']).default('mock'),
  ASR_PROVIDER: z.enum(['siliconflow', 'volcano']).default('siliconflow'),
  VOICE_DAILY_LIMIT: z.coerce.number().int().positive().default(20),
  VOICE_PARTIAL_DAILY_LIMIT: z.coerce.number().int().positive().default(300),
  VOICE_IP_MINUTE_LIMIT: z.coerce.number().int().positive().default(30),
  VOICE_IP_DAILY_LIMIT: z.coerce.number().int().positive().default(600),
  VOICE_GLOBAL_MINUTE_LIMIT: z.coerce.number().int().positive().default(120),
  VOICE_GLOBAL_DAILY_LIMIT: z.coerce.number().int().positive().default(5000),
  VOICE_MAX_STREAM_BYTES: z.coerce.number().int().positive().default(960_000),
  VOICE_MAX_STREAM_MS: z.coerce.number().int().positive().default(32_000),
  VOICE_MAX_CONCURRENT_PER_IP: z.coerce.number().int().positive().default(8),
  VOICE_MAX_CONCURRENT_GLOBAL: z.coerce.number().int().positive().default(80),
  SILICONFLOW_API_KEY: z.string().optional(),
  SILICONFLOW_BASE_URL: z.string().url().default('https://api.siliconflow.cn/v1'),
  SILICONFLOW_ASR_MODEL: z.string().default('Qwen/Qwen3-ASR-1.7B'),
  VOLCENGINE_ASR_API_KEY: z.string().optional(),
  VOLCENGINE_ASR_RESOURCE_ID: z.string().default('volc.seedasr.sauc.duration'),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-chat'),
  ALIYUN_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: z.string().optional(),
  ANALYTICS_ENABLED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  ANALYTICS_DATA_DIR: z.string().min(1).default('.analytics'),
  ANALYTICS_HASH_SALT: z.string().min(16).optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(): Environment {
  return environmentSchema.parse(process.env);
}
