import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface E2ERunFile {
  runId: string;
  createdAt: string;
}

export function newRunId(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, (match) => (match === 'T' ? '-' : ''));
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

export default async function globalSetup(): Promise<void> {
  const runId = process.env.E2E_RUN_ID ?? newRunId();
  await execFileAsync('pnpm', ['db:seed:e2e', '--', '--run', runId], {
    shell: process.platform === 'win32',
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, E2E_RUN_ID: runId },
  });
  const payload: E2ERunFile = { runId, createdAt: new Date().toISOString() };
  await writeFile(path.join(__dirname, '.run.json'), JSON.stringify(payload, null, 2));
}
