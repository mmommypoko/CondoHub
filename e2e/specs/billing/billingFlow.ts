import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { apiJson } from '../../helpers/api';

export interface JobTriggerBody {
  triggerSource: 'CRON' | 'MANUAL' | 'STARTUP_DEFERRED';
  fromCycle?: string;
  toCycle?: string;
  batchSize?: number;
}

export interface GenerateJobEnvelope {
  data: {
    created: number;
    skipped: number;
    reviewRequired: number;
    caughtUp: boolean;
    nextFromCycle?: string;
  };
}

export interface AlreadyRunningEnvelope {
  data: { skipped: 'already-running' };
}

export interface InvoiceRow {
  id: string;
  roomId: string;
  tenancyId: string | null;
  kind: 'PRIVATE_RENT' | 'PROJECT_MANAGED_RENT' | 'COMMON_FEE';
  periodStart: string;
  periodEnd: string;
  total: { amount: string; currency: string };
  dueDate: string;
  issuedAt: string | null;
}

export interface InvoiceListEnvelope {
  data: InvoiceRow[];
  meta: { page: number; pageSize: number; total: number };
}

export interface InvoiceDetailEnvelope {
  data: InvoiceRow;
}

export interface ChargeEventRow {
  id: string;
  sourceRuleId: string | null;
  eventEffectiveDate: string;
  projectTimezone: string | null;
  configuredAmount: { amount: string; currency: string } | null;
  chargeContext: unknown;
  createdBy: string | null;
  createdAt: string;
  status: 'OPEN' | 'ISSUED' | 'CANCELLED';
}

export interface ChargeEventEnvelope {
  data: ChargeEventRow;
}

export interface JobRunRow {
  id: string;
  jobName: string;
  businessKey: string;
  state: 'RUNNING' | 'DONE' | 'ERROR';
  result: Record<string, unknown> | null;
  attempt: number;
  triggerSource: string;
  startedAt: string;
  finishedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface JobRunListEnvelope {
  data: JobRunRow[];
  meta: { page: number; pageSize: number; total: number };
}

export interface JobRunDetailEnvelope {
  data: JobRunRow & { heartbeatAt: string; createdAt: string; updatedAt: string };
}

export interface ErrorEnvelope {
  error: { code: string; message: string };
}

export const REDACTED_JOB_KEYS = ['created', 'skipped', 'reviewRequired', 'caughtUp', 'nextFromCycle'];

export function jobSecret(): string {
  const value = process.env.JOB_TRIGGER_SECRET;
  if (value === undefined || value === '') {
    throw new Error('Billing E2E needs the JOB_TRIGGER_SECRET env var.');
  }
  return value;
}

let lastJobPostAt = 0;

async function paceJobPosts(): Promise<void> {
  const gapMs = 7000;
  const now = Date.now();
  const wait = gapMs - (now - lastJobPostAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastJobPostAt = Date.now();
}

export async function postJobRaw(
  request: APIRequestContext,
  body: unknown,
  headers?: Record<string, string>,
): Promise<{ status: number; json: unknown }> {
  await paceJobPosts();
  const response = await request.fetch('/api/internal/jobs/generate-invoices', {
    method: 'POST',
    data: body,
    headers: { 'content-type': 'application/json', ...headers },
  });
  return { status: response.status(), json: (await response.json()) as unknown };
}

export async function triggerGenerate(
  request: APIRequestContext,
  body: JobTriggerBody,
): Promise<{ status: number; json: GenerateJobEnvelope }> {
  const posted = await postJobRaw(request, body, { 'x-job-secret': jobSecret() });
  expect(posted.status).toBe(200);
  return posted as { status: number; json: GenerateJobEnvelope };
}

export function expectRedactedJobPayload(payload: unknown): void {
  const record = payload as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    expect(REDACTED_JOB_KEYS).toContain(key);
  }
  expect(JSON.stringify(record).toLowerCase()).not.toContain('private');
}

export async function listInvoices(
  request: APIRequestContext,
  query: { roomId?: string; kind?: string; pageSize?: number },
): Promise<InvoiceRow[]> {
  const params = new URLSearchParams();
  if (query.roomId !== undefined) params.set('roomId', query.roomId);
  if (query.kind !== undefined) params.set('kind', query.kind);
  params.set('pageSize', String(query.pageSize ?? 100));
  const listed = await apiJson<InvoiceListEnvelope>(request, {
    method: 'GET',
    path: `/api/invoices?${params.toString()}`,
  });
  expect(listed.status).toBe(200);
  return listed.json.data;
}

export async function getInvoice(
  request: APIRequestContext,
  id: string,
): Promise<InvoiceRow> {
  const detail = await apiJson<InvoiceDetailEnvelope>(request, {
    method: 'GET',
    path: `/api/invoices/${id}`,
  });
  expect(detail.status).toBe(200);
  return detail.json.data;
}

export async function postChargeEvent(
  request: APIRequestContext,
  body: unknown,
): Promise<{ status: number; json: ChargeEventEnvelope }> {
  const posted = await apiJson<ChargeEventEnvelope>(request, {
    method: 'POST',
    path: '/api/admin/billing/common-fee-events',
    body,
  });
  expect(posted.status).toBe(200);
  return posted;
}

export async function getChargeEvent(
  request: APIRequestContext,
  id: string,
): Promise<ChargeEventRow> {
  const detail = await apiJson<ChargeEventEnvelope>(request, {
    method: 'GET',
    path: `/api/admin/billing/common-fee-events/${id}`,
  });
  expect(detail.status).toBe(200);
  return detail.json.data;
}

export async function listJobRuns(
  request: APIRequestContext,
  query: { jobName?: string; state?: string; pageSize?: number } = {},
): Promise<JobRunRow[]> {
  const params = new URLSearchParams();
  if (query.jobName !== undefined) params.set('jobName', query.jobName);
  if (query.state !== undefined) params.set('state', query.state);
  params.set('pageSize', String(query.pageSize ?? 100));
  const listed = await apiJson<JobRunListEnvelope>(request, {
    method: 'GET',
    path: `/api/admin/billing/job-runs?${params.toString()}`,
  });
  expect(listed.status).toBe(200);
  return listed.json.data;
}

export async function getJobRun(
  request: APIRequestContext,
  id: string,
): Promise<JobRunDetailEnvelope['data']> {
  const detail = await apiJson<JobRunDetailEnvelope>(request, {
    method: 'GET',
    path: `/api/admin/billing/job-runs/${id}`,
  });
  expect(detail.status).toBe(200);
  return detail.json.data;
}

export async function findBillingRoom(page: Page, roomCode: string): Promise<string> {
  for (let sheet = 1; sheet <= 20; sheet += 1) {
    const listed = await apiJson<{ data: Array<{ id: string; roomCode: string }> }>(page.request, {
      method: 'GET',
      path: `/api/rooms?page=${sheet}&pageSize=100`,
    });
    expect(listed.status).toBe(200);
    const found = listed.json.data.find((room) => room.roomCode === roomCode);
    if (found !== undefined) return found.id;
    if (listed.json.data.length < 100) break;
  }
  throw new Error(`Billing room ${roomCode} was not found.`);
}

export function invoiceCountKey(row: InvoiceRow): string {
  return `${row.roomId}|${row.kind}|${row.periodStart}|${row.tenancyId ?? ''}|${row.total.amount}`;
}
