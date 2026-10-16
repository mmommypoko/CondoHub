import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '@/shared/db/transaction';
import { invoice, type InvoiceKind } from './schema';

export interface InvoiceRecord {
  id: string;
  roomId: string;
  tenancyId: string | null;
  kind: InvoiceKind;
  sourceRuleId: string | null;
  sourceTurnoverReviewId: string | null;
  oneTimeChargeEventId: string | null;
  periodStart: string;
  periodEnd: string;
  serviceStart: Date;
  serviceEndExclusive: Date;
  total: bigint;
  dueDate: string;
  snapshotBoundaryAt: Date;
  snapshotTimezone: string;
  issuerId: string | null;
  issuedAt: Date | null;
  version: number;
  pastDueDateConfirmed: boolean | null;
  pastDueDateConfirmedAt: Date | null;
  createdAt: Date;
}

function toRecord(row: typeof invoice.$inferSelect): InvoiceRecord {
  return {
    id: row.id,
    roomId: row.roomId,
    tenancyId: row.tenancyId,
    kind: row.kind,
    sourceRuleId: row.sourceRuleId,
    sourceTurnoverReviewId: row.sourceTurnoverReviewId,
    oneTimeChargeEventId: row.oneTimeChargeEventId,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    serviceStart: row.serviceStart,
    serviceEndExclusive: row.serviceEndExclusive,
    total: row.total,
    dueDate: row.dueDate,
    snapshotBoundaryAt: row.snapshotBoundaryAt,
    snapshotTimezone: row.snapshotTimezone,
    issuerId: row.issuerId,
    issuedAt: row.issuedAt,
    version: row.version,
    pastDueDateConfirmed: row.pastDueDateConfirmed,
    pastDueDateConfirmedAt: row.pastDueDateConfirmedAt,
    createdAt: row.createdAt,
  };
}

export async function findInvoiceById(conn: Db, id: string): Promise<InvoiceRecord | null> {
  const rows = await conn.select().from(invoice).where(eq(invoice.id, id)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toRecord(row);
}

export async function listInvoicesScoped(
  conn: Db,
  input: {
    allowedKinds: InvoiceKind[];
    roomId?: string | undefined;
    kind?: InvoiceKind | undefined;
    limit: number;
    offset: number;
  },
): Promise<{ rows: InvoiceRecord[]; total: number }> {
  const conditions = [inArray(invoice.kind, input.allowedKinds)];
  if (input.roomId !== undefined) conditions.push(eq(invoice.roomId, input.roomId));
  if (input.kind !== undefined) conditions.push(eq(invoice.kind, input.kind));
  const where = and(...conditions);
  const rows = await conn
    .select()
    .from(invoice)
    .where(where)
    .orderBy(desc(invoice.createdAt), desc(invoice.id))
    .limit(input.limit)
    .offset(input.offset);
  const counted = await conn.select({ count: sql<number>`count(*)` }).from(invoice).where(where);
  return { rows: rows.map(toRecord), total: Number(counted[0]?.count ?? 0) };
}

export async function findInvoiceByNaturalKey(
  conn: Db,
  input: {
    roomId: string;
    kind: InvoiceKind;
    periodStart: string;
    tenancyId?: string | null | undefined;
    sourceRuleId?: string | null | undefined;
    oneTimeChargeEventId?: string | null | undefined;
  },
): Promise<InvoiceRecord | null> {
  const rows = await conn
    .select()
    .from(invoice)
    .where(
      and(
        eq(invoice.roomId, input.roomId),
        eq(invoice.kind, input.kind),
        eq(invoice.periodStart, input.periodStart),
      ),
    )
    .limit(20);
  const found = rows.find(
    (row) =>
      (row.tenancyId ?? null) === (input.tenancyId ?? null) &&
      (row.sourceRuleId ?? null) === (input.sourceRuleId ?? null) &&
      (row.oneTimeChargeEventId ?? null) === (input.oneTimeChargeEventId ?? null),
  );
  return found === undefined ? null : toRecord(found);
}
