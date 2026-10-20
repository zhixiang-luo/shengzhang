import { config as loadDotenv } from 'dotenv';

import { buildApp } from './app.js';
import { loadEnvironment } from './config.js';
import { InMemoryDailyVoiceQuota } from './security/voice-quota.js';
import { attachVoiceStreamServer } from './voiceStream.js';

loadDotenv({ path: new URL('../../../.env', import.meta.url) });

const environment = loadEnvironment();
const app = buildApp();

if (environment.ASR_PROVIDER === 'volcano') {
  if (!environment.VOLCENGINE_ASR_API_KEY) {
    throw new Error('ASR_PROVIDER=volcano requires VOLCENGINE_ASR_API_KEY');
  }
  attachVoiceStreamServer(app.server, {
    apiKey: environment.VOLCENGINE_ASR_API_KEY,
    resourceId: environment.VOLCENGINE_ASR_RESOURCE_ID,
    quota: new InMemoryDailyVoiceQuota(environment.VOICE_PARTIAL_DAILY_LIMIT),
    logger: app.log,
  });
}

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: environment.HOST, port: environment.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
