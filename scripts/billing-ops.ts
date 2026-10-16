import { randomUUID } from 'node:crypto';
import { assertSeedAllowed, loadDotenv } from './seed-common';

loadDotenv('.env.local');

function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function issueEvent(eventId: string): Promise<void> {
  const { createBillingCtx, generateOneTimeEventInvoices } = await import(
    '@/modules/billing-payments/application/index'
  );
  const ctx = createBillingCtx({ requestId: randomUUID(), isSeedActor: true });
  const actor = {
    userId: 'seed-billing-ops',
    isSystemAdmin: true,
    accountStatus: 'ACTIVE' as const,
    mustChangePassword: false,
  };
  const counts = await generateOneTimeEventInvoices(actor, eventId, ctx);
  console.log(JSON.stringify({
    eventId,
    created: counts.created,
    skipped: counts.skipped,
    reviewRequired: counts.reviewRequired,
    cycleErrors: counts.cycleErrors.length,
  }));
}

async function holdLease(businessKey: string, holdMs: number): Promise<void> {
  const { db } = await import('@/shared/db/client');
  const { acquireJobLease, finishJobLease } = await import('@/shared/db/jobLease');
  const lease = await acquireJobLease(db, 'generate-invoices', businessKey, 'MANUAL');
  if (!lease.acquired) {
    console.log(JSON.stringify({ businessKey, held: false }));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ businessKey, held: true, attempt: lease.attempt }));
  await new Promise((resolve) => setTimeout(resolve, holdMs));
  await finishJobLease(db, 'generate-invoices', businessKey, lease.attempt, {
    state: 'ERROR',
    error: { code: 'INTERNAL_ERROR', message: 'Lease hold released by billing ops driver.' },
  });
  console.log(JSON.stringify({ businessKey, released: true }));
}

async function probeReview(roomCode: string, calendarMonth: string): Promise<void> {
  const { db } = await import('@/shared/db/client');
  const { turnoverBillingReview } = await import(
    '@/modules/billing-payments/infrastructure/schema'
  );
  const { turnoverReviewResponsibleOwner } = await import(
    '@/modules/billing-payments/infrastructure/schema'
  );
  const { room } = await import('@/modules/property-membership/infrastructure/schema');
  const { eq, and } = await import('drizzle-orm');
  const rooms = await db.select().from(room).where(eq(room.roomCode, roomCode)).limit(1);
  const found = rooms[0];
  if (found === undefined) {
    console.log(JSON.stringify({ roomCode, review: null }));
    return;
  }
  const reviews = await db
    .select()
    .from(turnoverBillingReview)
    .where(
      and(
        eq(turnoverBillingReview.roomId, found.id),
        eq(turnoverBillingReview.calendarMonth, calendarMonth),
      ),
    )
    .limit(1);
  const review = reviews[0];
  if (review === undefined) {
    console.log(JSON.stringify({ roomCode, review: null }));
    return;
  }
  const owners = await db
    .select()
    .from(turnoverReviewResponsibleOwner)
    .where(eq(turnoverReviewResponsibleOwner.reviewId, review.id));
  console.log(JSON.stringify({
    roomCode,
    review: {
      id: review.id,
      state: review.state,
      candidateTenancyIds: review.candidateTenancyIds,
      snapshotOwners: owners.length,
    },
  }));
}

async function probeTurnoverResolution(reviewId: string): Promise<void> {
  const { db } = await import('@/shared/db/client');
  const {
    invoice,
    privateRentInvoiceReviewer,
    turnoverBillingReview,
  } = await import('@/modules/billing-payments/infrastructure/schema');
  const { eq } = await import('drizzle-orm');
  const reviews = await db
    .select()
    .from(turnoverBillingReview)
    .where(eq(turnoverBillingReview.id, reviewId))
    .limit(1);
  const review = reviews[0];
  if (review === undefined) {
    console.log(JSON.stringify({ reviewId, review: null }));
    return;
  }
  const invoices = await db
    .select()
    .from(invoice)
    .where(eq(invoice.sourceTurnoverReviewId, reviewId));
  const reviewers: Array<{ invoiceId: string; userId: string }> = [];
  for (const row of invoices) {
    const rows = await db
      .select({
        invoiceId: privateRentInvoiceReviewer.invoiceId,
        userId: privateRentInvoiceReviewer.userId,
      })
      .from(privateRentInvoiceReviewer)
      .where(eq(privateRentInvoiceReviewer.invoiceId, row.id));
    for (const entry of rows) reviewers.push(entry);
  }
  console.log(JSON.stringify({
    reviewId,
    review: {
      state: review.state,
      version: review.version,
      decisionType: review.decisionType,
      reason: review.reason,
    },
    invoices: invoices.map((row) => ({
      id: row.id,
      tenancyId: row.tenancyId,
      kind: row.kind,
      periodStart: row.periodStart,
      dueDate: row.dueDate,
      totalAmount: row.total.toString(),
      reviewerSnapshotSource: row.reviewerSnapshotSource,
      pastDueDateConfirmed: row.pastDueDateConfirmed,
      payee: row.paymentInstructionSnapshot,
    })),
    reviewers,
  }));
}

async function probeTurnoverAudit(resourceId: string): Promise<void> {
  const { db } = await import('@/shared/db/client');
  const { auditLog } = await import('@/shared/db/schema/audit');
  const { eq } = await import('drizzle-orm');
  const rows = await db
    .select({
      action: auditLog.action,
      resourceType: auditLog.resourceType,
      afterJson: auditLog.afterJson,
    })
    .from(auditLog)
    .where(eq(auditLog.resourceId, resourceId));
  console.log(JSON.stringify({
    resourceId,
    entries: rows.map((row) => ({
      action: row.action,
      resourceType: row.resourceType,
      after: row.afterJson,
    })),
  }));
}

async function probeFeeOwners(invoiceId: string): Promise<void> {
  const { db } = await import('@/shared/db/client');
  const { commonFeeInvoiceResponsibleOwner } = await import(
    '@/modules/billing-payments/infrastructure/schema'
  );
  const { eq } = await import('drizzle-orm');
  const rows = await db
    .select({ userId: commonFeeInvoiceResponsibleOwner.userId })
    .from(commonFeeInvoiceResponsibleOwner)
    .where(eq(commonFeeInvoiceResponsibleOwner.invoiceId, invoiceId));
  console.log(JSON.stringify({ invoiceId, snapshotOwners: rows.length }));
}

async function main(): Promise<void> {
  assertSeedAllowed();
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === 'issue-event') {
    const eventId = flagValue(argv, '--event');
    if (eventId === undefined || eventId === '') throw new Error('Missing required --event <id>.');
    await issueEvent(eventId);
    return;
  }
  if (command === 'hold-lease') {
    const key = flagValue(argv, '--key');
    const ms = Number(flagValue(argv, '--ms') ?? '15000');
    if (key === undefined || key === '') throw new Error('Missing required --key <business-key>.');
    if (!Number.isInteger(ms) || ms < 1000 || ms > 120000) throw new Error('The --ms hold must be 1000..120000.');
    await holdLease(key, ms);
    return;
  }
  if (command === 'probe-review') {
    const code = flagValue(argv, '--room');
    const month = flagValue(argv, '--month');
    if (code === undefined || code === '') throw new Error('Missing required --room <room-code>.');
    if (month === undefined || month === '') throw new Error('Missing required --month <YYYY-MM-01>.');
    await probeReview(code, month);
    return;
  }
  if (command === 'probe-fee-owners') {
    const invoiceId = flagValue(argv, '--invoice');
    if (invoiceId === undefined || invoiceId === '') throw new Error('Missing required --invoice <id>.');
    await probeFeeOwners(invoiceId);
    return;
  }
  if (command === 'probe-turnover') {
    const reviewId = flagValue(argv, '--review');
    if (reviewId === undefined || reviewId === '') throw new Error('Missing required --review <id>.');
    await probeTurnoverResolution(reviewId);
    return;
  }
  if (command === 'probe-audit') {
    const resourceId = flagValue(argv, '--resource');
    if (resourceId === undefined || resourceId === '') throw new Error('Missing required --resource <id>.');
    await probeTurnoverAudit(resourceId);
    return;
  }
  throw new Error(`Unknown billing-ops command: ${command ?? '(none)'}.`);
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  },
);
