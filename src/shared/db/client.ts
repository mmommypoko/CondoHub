import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '@/config/env';
import { logger } from '@/shared/observability/logger';
import type { Database } from './transaction';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 10_000,
});

pool.on('error', (error) => {
  logger.error(
    {
      code: errorCodeOf(error),
      message: errorMessageOf(error),
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      at: new Date().toISOString(),
    },
    'database pool error',
  );
  process.exitCode = 1;
});

function errorCodeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const db: Database = drizzle(pool);

export async function closeDb(): Promise<void> {
  await pool.end();
}
