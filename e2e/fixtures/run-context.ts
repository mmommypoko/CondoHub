import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface RunContext {
  runId: string;
  createdAt: string;
}

export async function readRunContext(): Promise<RunContext> {
  const raw = await readFile(path.join(__dirname, '..', '.run.json'), 'utf8');
  const parsed = JSON.parse(raw) as RunContext;
  if (typeof parsed.runId !== 'string' || parsed.runId === '') {
    throw new Error('E2E run file is missing runId.');
  }
  return parsed;
}

export function namespaced(prefix: string, runId: string, name: string): string {
  return `${prefix}_${runId}_${name}`;
}

export function workerNamespace(runId: string, workerIndex: number): string {
  return `${runId}-w${workerIndex}`;
}
