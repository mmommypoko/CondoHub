import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import type { Db } from '@/shared/db/transaction';
import { AppError } from '@/shared/utils/errors';
import { satangToDecimalString } from '@/shared/utils/money';
import type { InvoiceKind } from '../infrastructure/schema';
import {
  findInvoiceById,
  listInvoicesScoped,
} from '../infrastructure/invoiceRepository';
import {
  listFeeInvoiceResponsibleOwners,
  listRentInvoiceReviewers,
} from '../infrastructure/invoiceSnapshotRepository';
import {
  getActiveResidentRooms,
  getMembershipIntervals,
  getOwnersAt,
} from '@/modules/property-membership/application/index';

export interface InvoiceDto {
  id: string;
  roomId: string;
  tenancyId: string | null;
  kind: InvoiceKind;
  periodStart: string;
  periodEnd: string;
  total: { amount: string; currency: 'THB' };
  dueDate: string;
  issuedAt: string | null;
}

export interface InvoicePage {
  rows: InvoiceDto[];
  total: number;
}

interface InvoiceRowShape {
  id: string;
  roomId: string;
  tenancyId: string | null;
  kind: InvoiceKind;
  periodStart: string;
  periodEnd: string;
  serviceStart: Date;
  serviceEndExclusive: Date;
  total: bigint;
  dueDate: string;
  issuedAt: Date | null;
}

function toDto(row: InvoiceRowShape): InvoiceDto {
  return {
    id: row.id,
    roomId: row.roomId,
    tenancyId: row.tenancyId,
    kind: row.kind,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    total: { amount: satangToDecimalString(row.total), currency: 'THB' },
    dueDate: row.dueDate,
    issuedAt: row.issuedAt === null ? null : row.issuedAt.toISOString(),
  };
}

function assertActive(actor: Actor): void {
  if (actor.accountStatus !== 'ACTIVE') throw new AppError('ACCESS_DENIED');
  if (actor.mustChangePassword) throw new AppError('FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED');
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date,
): boolean {
  const aEndMs = aEnd === null ? Number.POSITIVE_INFINITY : aEnd.getTime();
  return aStart.getTime() < bEnd.getTime() && aEndMs > bStart.getTime();
}

async function canSeeInvoice(actor: Actor, row: InvoiceRowShape, at: Date, conn: Db): Promise<boolean> {
  if (row.kind === 'PRIVATE_RENT') {
    const reviewers = await listRentInvoiceReviewers(conn, row.id);
    if (reviewers.some((member) => member.userId === actor.userId)) return true;
  }
  if (row.kind === 'COMMON_FEE') {
    const owners = await listFeeInvoiceResponsibleOwners(conn, row.id);
    if (owners.some((member) => member.userId === actor.userId)) return true;
  }
  if (row.tenancyId !== null) {
    const intervals = await getMembershipIntervals(actor.userId, row.tenancyId).catch(() => []);
    for (const interval of intervals) {
      if (intervalsOverlap(interval.start, interval.end, row.serviceStart, row.serviceEndExclusive)) {
        return true;
      }
    }
  }
  if (row.kind === 'COMMON_FEE') {
    const [rooms, owners] = await Promise.all([
      getActiveResidentRooms(actor.userId, at).catch(() => [] as string[]),
      getOwnersAt(row.roomId, at).catch(() => []),
    ]);
    if (rooms.includes(row.roomId)) return true;
    if (owners.some((owner) => owner.userId === actor.userId)) return true;
  }
  if (row.kind === 'PROJECT_MANAGED_RENT' && actor.isSystemAdmin) return true;
  return false;
}

export async function listInvoices(
  actor: Actor,
  input: {
    roomId?: string | undefined;
    kind?: InvoiceKind | undefined;
    page: number;
    pageSize: number;
    at: Date;
  },
  conn: Db = db,
): Promise<InvoicePage> {
  assertActive(actor);
  const allowedKinds: InvoiceKind[] = actor.isSystemAdmin
    ? ['PROJECT_MANAGED_RENT', 'COMMON_FEE']
    : ['PRIVATE_RENT', 'PROJECT_MANAGED_RENT', 'COMMON_FEE'];
  if (input.kind !== undefined && !allowedKinds.includes(input.kind)) {
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  const page = await listInvoicesScoped(conn, {
    allowedKinds,
    limit: 500,
    offset: 0,
    ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
  });
  const visible: InvoiceRowShape[] = [];
  for (const row of page.rows) {
    if (actor.isSystemAdmin && row.kind === 'COMMON_FEE') {
      visible.push(row);
      continue;
    }
    if (await canSeeInvoice(actor, row, input.at, conn)) visible.push(row);
  }
  const limit = Math.min(Math.max(input.pageSize, 1), 100);
  const offset = (Math.max(input.page, 1) - 1) * limit;
  return { rows: visible.slice(offset, offset + limit).map(toDto), total: visible.length };
}

export async function getInvoice(
  actor: Actor,
  id: string,
  at: Date,
  conn: Db = db,
): Promise<InvoiceDto | null> {
  assertActive(actor);
  const row = await findInvoiceById(conn, id);
  if (row === null) return null;
  if (actor.isSystemAdmin && row.kind === 'PRIVATE_RENT') return null;
  if (actor.isSystemAdmin && row.kind !== 'PRIVATE_RENT') return toDto(row);
  if (!(await canSeeInvoice(actor, row, at, conn))) return null;
  return toDto(row);
}
