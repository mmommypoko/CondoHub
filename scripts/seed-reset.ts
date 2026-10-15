import { Pool } from 'pg';
import { assertSeedAllowed, loadDotenv, parseRunId } from './seed-common';

loadDotenv('.env.local');

interface ResetTarget {
  label: string;
  sql: string;
  pattern: 'raw' | 'normalized';
}

function resetTargets(): ResetTarget[] {
  return [
    {
      label: 'image_attachment',
      sql: `DELETE FROM "image_attachment" WHERE "object_key" LIKE 'e2e/%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'raw',
    },
    {
      label: 'announcement_revision',
      sql: `DELETE FROM "announcement_revision" WHERE "announcement_id" IN (SELECT "id" FROM "announcement" WHERE "title" LIKE '%' || $1 || '%' ESCAPE '\\')`,
      pattern: 'raw',
    },
    {
      label: 'announcement',
      sql: `DELETE FROM "announcement" WHERE "title" LIKE '%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'raw',
    },
    {
      label: 'room_membership',
      sql: `DELETE FROM "room_membership" WHERE "room_id" IN (SELECT "id" FROM "room" WHERE "room_code" LIKE '%' || $1 || '%' ESCAPE '\\')`,
      pattern: 'raw',
    },
    {
      label: 'rental_period',
      sql: `DELETE FROM "rental_period" WHERE "room_id" IN (SELECT "id" FROM "room" WHERE "room_code" LIKE '%' || $1 || '%' ESCAPE '\\')`,
      pattern: 'raw',
    },
    {
      label: 'room_ownership',
      sql: `DELETE FROM "room_ownership" WHERE "room_id" IN (SELECT "id" FROM "room" WHERE "room_code" LIKE '%' || $1 || '%' ESCAPE '\\')`,
      pattern: 'raw',
    },
    {
      label: 'room',
      sql: `DELETE FROM "room" WHERE "room_code" LIKE '%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'raw',
    },
    {
      label: 'floor',
      sql: `DELETE FROM "floor" WHERE "code" LIKE '%' || $1 || '%' ESCAPE '\\' OR "label" LIKE '%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'raw',
    },
    {
      label: 'building',
      sql: `DELETE FROM "building" WHERE "code" LIKE '%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'raw',
    },
    {
      label: 'user',
      sql: `DELETE FROM "user" WHERE "username" LIKE '%' || $1 || '%' ESCAPE '\\'`,
      pattern: 'normalized',
    },
  ];
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function normalizedRun(runId: string): string {
  return runId.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function main(): Promise<void> {
  assertSeedAllowed();
  const runId = parseRunId(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === '') throw new Error('Missing DATABASE_URL.');
  const pool = new Pool({ connectionString, max: 1, ssl: { rejectUnauthorized: false } });
  try {
    const raw = escapeLike(runId);
    const normalized = escapeLike(normalizedRun(runId));
    for (const target of resetTargets()) {
      try {
        const result = await pool.query(target.sql, [target.pattern === 'raw' ? raw : normalized]);
        console.log(`reset ${target.label}: deleted ${result.rowCount ?? 0} rows for run ${runId}.`);
      } catch (error) {
        console.log(`reset ${target.label}: skipped (${error instanceof Error ? error.message : 'unknown error'}).`);
      }
    }
  } finally {
    await pool.end();
  }
}

void main();
