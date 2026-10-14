import { createServer } from 'node:http';
import next from 'next';
import { env } from '@/config/env';
import { logger } from '@/shared/observability/logger';
import { attachSocket } from './socket';

const app = next({ dev: env.NODE_ENV !== 'production' });
const handler = app.getRequestHandler();

async function main(): Promise<void> {
  await app.prepare();
  const httpServer = createServer((req, res) => {
    void handler(req, res);
  });
  attachSocket(httpServer);
  httpServer.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT }, 'server listening');
  });
  const shutdown = (): void => {
    logger.info('shutdown signal received');
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void main();
