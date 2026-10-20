import { config as loadDotenv } from 'dotenv';

import { buildApp } from './app.js';
import { loadEnvironment } from './config.js';

loadDotenv({ path: new URL('../../../.env', import.meta.url) });

const environment = loadEnvironment();
const app = buildApp();

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
