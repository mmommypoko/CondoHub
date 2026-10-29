import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import type { Db } from '@/shared/db/transaction';
import { AppError } from '@/shared/utils/errors';
import { listAttachedImagesForEntity } from '@/modules/media-attachments/application/index';
import type { MaintenanceRoutingKind, MaintenanceStatus, MaintenanceTicketState } from '../infrastructure/schema';
import {
  allowedRoutingKinds,
  evaluateTicketAccess,
  type TicketActorGrants,
} from '../domain/ticketPolicy';
import {
  findTicketById,
  isTicketMemberVisible,
  isTicketRecipient,
  listTicketsForAdmin,
  listTicketsForMember,
  type TicketRecord,
} from '../infrastructure/ticketRepository';
import { listTicketComments, type TicketCommentRecord } from '../infrastructure/commentRepository';
import { listStatusHistory, type TicketHistoryRecord } from '../infrastructure/historyRepository';

export interface TicketImageDto {
  id: string;
  byteSize: number;
  mime: string;
  width: number | null;
  height: number | null;
}

export interface TicketCommentDto {
  id: string;
  authorId: string;
  body: string;
  images: TicketImageDto[];
  createdAt: string;
}

export interface TicketHistoryDto {
  id: string;
  fromState: MaintenanceTicketState;
  toState: MaintenanceTicketState;
  actorId: string | null;
  reason: string | null;
  changedAt: string;
}

export interface TicketDto {
  id: string;
  routingKind: MaintenanceRoutingKind;
  roomId: string | null;
  locationDescription: string;
  subject: string;
  description: string;
  status: MaintenanceStatus;
  version: number;
  reporterId: string;
  canHandle: boolean;
  images: TicketImageDto[];
  comments: TicketCommentDto[];
  history: TicketHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketPage {
  rows: TicketDto[];
  total: number;
}

function assertActive(actor: Actor): void {
  if (actor.accountStatus !== 'ACTIVE') throw new AppError('ACCESS_DENIED');
  if (actor.mustChangePassword) throw new AppError('FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED');
}

function toImageDto(image: {
  id: string;
  sizeBytes: number;
  mime: string;
  width: number | null;
  height: number | null;
}): TicketImageDto {
  return {
    id: image.id,
    byteSize: image.sizeBytes,
    mime: image.mime,
    width: image.width,
    height: image.height,
  };
}

function toHistoryDto(row: TicketHistoryRecord): TicketHistoryDto {
  return {
    id: row.id,
    fromState: row.fromState,
    toState: row.toState,
    actorId: row.actorId,
    reason: row.reason,
    changedAt: row.changedAt.toISOString(),
  };
}

export async function buildTicketGrants(
  conn: Db,
  actor: Actor,
  row: TicketRecord,
): Promise<TicketActorGrants> {
  const recipient =
    row.routingKind === 'PRIVATE_OWNER' && !actor.isSystemAdmin
      ? await isTicketRecipient(conn, { ticketId: row.id, userId: actor.userId })
      : false;
  return {
    actorIsSystemAdmin: actor.isSystemAdmin,
    actorSuspended: actor.accountStatus !== 'ACTIVE',
    actorMustChangePassword: actor.mustChangePassword,
    actorIsReporter: row.reporterId === actor.userId,
    actorInRecipientSnapshot: recipient,
  };
}

export async function assertTicketVisible(
  conn: Db,
  actor: Actor,
  row: TicketRecord,
): Promise<TicketActorGrants> {
  if (actor.isSystemAdmin && row.routingKind === 'PRIVATE_OWNER') {
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  const grants = await buildTicketGrants(conn, actor, row);
  const verdict = evaluateTicketAccess(
    grants,
    { routingKind: row.routingKind, status: row.status },
    'VIEW',
  );
  if (!verdict.allowed) {
    if (verdict.httpStatus === 403) throw new AppError('ACCESS_DENIED');
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  return grants;
}

async function toCommentDto(conn: Db, row: TicketCommentRecord): Promise<TicketCommentDto> {
  const images = await listAttachedImagesForEntity(conn, {
    type: 'maintenance_comment',
    id: row.id,
  });
  return {
    id: row.id,
    authorId: row.authorId,
    body: row.body,
    images: images.map(toImageDto),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function toTicketDto(
  conn: Db,
  actor: Actor,
  ticketId: string,
): Promise<TicketDto | null> {
  const row = await findTicketById(conn, ticketId);
  if (row === null) return null;
  if (actor.isSystemAdmin && row.routingKind === 'PRIVATE_OWNER') return null;
  if (!actor.isSystemAdmin) {
    const visible = await isTicketMemberVisible(conn, { ticketId: row.id, userId: actor.userId });
    if (!visible) return null;
  }
  const grants = await buildTicketGrants(conn, actor, row);
  const verdict = evaluateTicketAccess(
    grants,
    { routingKind: row.routingKind, status: row.status },
    'VIEW',
  );
  if (!verdict.allowed) return null;
  const [images, comments, history] = await Promise.all([
    listAttachedImagesForEntity(conn, { type: 'maintenance_request', id: row.id }),
    listTicketComments(conn, row.id),
    listStatusHistory(conn, row.id),
  ]);
  const commentDtos: TicketCommentDto[] = [];
  for (const comment of comments) {
    commentDtos.push(await toCommentDto(conn, comment));
  }
  return {
    id: row.id,
    routingKind: row.routingKind,
    roomId: row.roomId,
    locationDescription: row.locationDescription,
    subject: row.subject,
    description: row.description,
    status: row.status,
    version: row.version,
    reporterId: row.reporterId,
    canHandle: evaluateTicketAccess(
      grants,
      { routingKind: row.routingKind, status: row.status },
      'TRANSITION_HANDLER',
    ).allowed,
    images: images.map(toImageDto),
    comments: commentDtos,
    history: history.map(toHistoryDto),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTickets(
  actor: Actor,
  input: {
    roomId?: string | undefined;
    routingKind?: MaintenanceRoutingKind | undefined;
    status?: MaintenanceStatus | undefined;
    page: number;
    pageSize: number;
    view?: 'open' | 'history' | undefined;
  },
  conn: Db = db,
): Promise<TicketPage> {
  assertActive(actor);
  const allowedKinds = allowedRoutingKinds(actor.isSystemAdmin);
  if (input.routingKind !== undefined && !allowedKinds.includes(input.routingKind)) {
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  const limit = Math.min(Math.max(input.pageSize, 1), 100);
  const offset = (Math.max(input.page, 1) - 1) * limit;
  const baseFilter = {
    view: input.view,
    ...(input.roomId !== undefined ? { roomId: input.roomId } : {}),
    ...(input.routingKind !== undefined ? { routingKind: input.routingKind } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  } as const;
  const fetchWindow = async (windowOffset: number, windowLimit: number) =>
    actor.isSystemAdmin
      ? listTicketsForAdmin(conn, { limit: windowLimit, offset: windowOffset, ...baseFilter })
      : listTicketsForMember(conn, {
          userId: actor.userId,
          limit: windowLimit,
          offset: windowOffset,
          ...baseFilter,
        });
  const total = (await fetchWindow(0, 1)).total;
  const visibleIds: string[] = [];
  let cursor = 0;
  const batch = 200;
  while (cursor < total) {
    const window = await fetchWindow(cursor, Math.min(batch, total - cursor));
    if (window.rows.length === 0) break;
    for (const row of window.rows) {
      if (await isRowListVisible(conn, actor, row)) visibleIds.push(row.id);
    }
    cursor += window.rows.length;
  }
  const pageRows: TicketDto[] = [];
  for (const id of visibleIds.slice(offset, offset + limit)) {
    const dto = await toTicketDto(conn, actor, id);
    if (dto !== null) pageRows.push(dto);
  }
  return { rows: pageRows, total: visibleIds.length };
}

async function isRowListVisible(conn: Db, actor: Actor, row: TicketRecord): Promise<boolean> {
  if (actor.isSystemAdmin && row.routingKind === 'PRIVATE_OWNER') return false;
  if (!actor.isSystemAdmin) {
    const visible = await isTicketMemberVisible(conn, { ticketId: row.id, userId: actor.userId });
    if (!visible) return false;
  }
  const grants = await buildTicketGrants(conn, actor, row);
  return evaluateTicketAccess(
    grants,
    { routingKind: row.routingKind, status: row.status },
    'VIEW',
  ).allowed;
}

export async function getTicket(
  actor: Actor,
  id: string,
  conn: Db = db,
): Promise<TicketDto | null> {
  assertActive(actor);
  return toTicketDto(conn, actor, id);
}
