import { Pool } from 'pg';
import { assertSeedAllowed, loadDotenv, parseRunId } from './seed-common';

loadDotenv('.env.local');

interface ResetTarget {
  label: string;
  sql: string;
}

function resetTargets(): ResetTarget[] {
  return [
    { label: 'room', sql: `DELETE FROM "room" WHERE "room_code" LIKE '%' || $1 || '%' ESCAPE '\\'` },
    { label: 'floor', sql: `DELETE FROM "floor" WHERE "code" LIKE '%' || $1 || '%' ESCAPE '\\'` },
    { label: 'building', sql: `DELETE FROM "building" WHERE "code" LIKE '%' || $1 || '%' ESCAPE '\\'` },
  ];
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function main(): Promise<void> {
  assertSeedAllowed();
  const runId = parseRunId(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === '') throw new Error('Missing DATABASE_URL.');
  const pool = new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: false } });
  try {
    const pattern = escapeLike(runId);
    for (const target of resetTargets()) {
      try {
        const result = await pool.query(target.sql, [pattern]);
        console.log(`reset ${target.label}: deleted ${result.rowCount ?? 0} rows for run ${runId}.`);
      } catch (error) {
        console.log(`reset ${target.label}: skipped (${error instanceof Error ? error.message : 'unknown error'}).`);
      }
    }
    console.log('P1-PENDING: users/memberships/tenancies extend reset when their tables land.');
  } finally {
    await pool.end();
  }
}

void main();
