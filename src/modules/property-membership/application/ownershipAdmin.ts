import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { mapPgError, AppError } from '@/shared/utils/errors';
import { writeAudit } from '@/shared/observability/audit';
import { findUserById } from '@/modules/identity-access/infrastructure/userRepository';
import { isOwnerAt, type OwnershipInterval } from '../domain/ownershipPolicy';
import { findRoomById } from '../infrastructure/structureRepository';
import {
  correctOwnership,
  endOwnership,
  findOwnershipById,
  insertOwnership,
  listOwnershipsByRoom,
} from '../infrastructure/ownershipRepository';
import type { PropertyCtx } from './ctx';

function requireAdmin(actor: Actor): void {
  if (!actor.isSystemAdmin) throw new AppError('ACCESS_DENIED');
}

function toIntervals(
  rows: Array<{ roomId: string; userId: string; startAt: Date; endAt: Date | null }>,
): OwnershipInterval[] {
  return rows.map((row) => ({
    roomId: row.roomId,
    userId: row.userId,
    start: row.startAt,
    end: row.endAt,
  }));
}

export interface TransferOwnershipInput {
  roomId: string;
  fromUserId: string;
  toUserId: string;
  effectiveAt: Date;
  idempotencyKey?: string | undefined;
}

export interface TransferOwnershipResult {
  endedOwnershipId: string;
  createdOwnershipId: string;
  effectiveAt: Date;
}

export async function transferOwnership(
  actor: Actor,
  input: TransferOwnershipInput,
  ctx: PropertyCtx,
): Promise<TransferOwnershipResult> {
  requireAdmin(actor);
  const room = await findRoomById(db, input.roomId);
  if (room === null) throw new AppError('RESOURCE_NOT_FOUND');
  if (input.fromUserId === input.toUserId) {
    throw new AppError('VALIDATION_ERROR', 'The transfer source and target must differ.');
  }
  const [fromUser, toUser] = await Promise.all([
    findUserById(db, input.fromUserId),
    findUserById(db, input.toUserId),
  ]);
  if (fromUser === null || toUser === null) {
    throw new AppError('VALIDATION_ERROR', 'The transfer user was not found.');
  }
  if (toUser.accountStatus !== 'ACTIVE') {
    throw new AppError('VALIDATION_ERROR', 'The target user cannot receive ownership.');
  }
  const ownerships = await listOwnershipsByRoom(db, input.roomId);
  const activeFrom = ownerships.find(
    (row) =>
      row.userId === input.fromUserId &&
      row.startAt.getTime() <= input.effectiveAt.getTime() &&
      (row.endAt === null || row.endAt.getTime() > input.effectiveAt.getTime()),
  );
  if (activeFrom === undefined) {
    throw new AppError('VALIDATION_ERROR', 'The source owner holds no interval at the effective time.');
  }
  try {
    return await db.transaction(async (tx) => {
      const ended = await endOwnership(tx, activeFrom.id, input.effectiveAt);
      if (ended === null) throw new AppError('RESOURCE_NOT_FOUND');
      const created = await insertOwnership(tx, {
        roomId: input.roomId,
        userId: input.toUserId,
        startAt: input.effectiveAt,
        grantedBy: actor.userId,
      });
      await writeAudit(tx, {
        actorId: actor.userId,
        action: 'ownership.transferred',
        resourceType: 'room_ownership',
        resourceId: created.id,
        requestId: ctx.requestId,
        before: { ownershipId: activeFrom.id, userId: input.fromUserId },
        after: {
          roomId: input.roomId,
          toUserId: input.toUserId,
          effectiveAt: input.effectiveAt.toISOString(),
        },
      });
      return {
        endedOwnershipId: activeFrom.id,
        createdOwnershipId: created.id,
        effectiveAt: input.effectiveAt,
      };
    });
  } catch (error) {
    throw mapPgError(error, {
      constraintCodes: { room_ownership_no_overlap_ex: 'VALIDATION_ERROR' },
      fallbackCodes: { '23P01': 'VALIDATION_ERROR' },
    });
  }
}

export async function removeOwnership(
  actor: Actor,
  input: { roomId: string; ownershipId: string; effectiveAt: Date },
  ctx: PropertyCtx,
): Promise<{ ownershipId: string; effectiveAt: Date }> {
  requireAdmin(actor);
  const room = await findRoomById(db, input.roomId);
  if (room === null) throw new AppError('RESOURCE_NOT_FOUND');
  const ownership = await findOwnershipById(db, input.ownershipId);
  if (ownership === null || ownership.roomId !== input.roomId) {
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  try {
    const ended = await db.transaction(async (tx) => {
      const next = await endOwnership(tx, input.ownershipId, input.effectiveAt);
      if (next === null) throw new AppError('RESOURCE_NOT_FOUND');
      await writeAudit(tx, {
        actorId: actor.userId,
        action: 'ownership.removed',
        resourceType: 'room_ownership',
        resourceId: input.ownershipId,
        requestId: ctx.requestId,
        before: { userId: ownership.userId, startAt: ownership.startAt.toISOString() },
        after: { effectiveAt: input.effectiveAt.toISOString() },
      });
      return next;
    });
    return { ownershipId: ended.id, effectiveAt: input.effectiveAt };
  } catch (error) {
    throw mapPgError(error);
  }
}

export async function correctOwnershipInterval(
  actor: Actor,
  input: {
    roomId: string;
    ownershipId: string;
    startAt?: Date | undefined;
    endAt?: Date | null | undefined;
    reason: string;
  },
  ctx: PropertyCtx,
): Promise<{ ownershipId: string }> {
  requireAdmin(actor);
  const room = await findRoomById(db, input.roomId);
  if (room === null) throw new AppError('RESOURCE_NOT_FOUND');
  const ownership = await findOwnershipById(db, input.ownershipId);
  if (ownership === null || ownership.roomId !== input.roomId) {
    throw new AppError('RESOURCE_NOT_FOUND');
  }
  const nextStart = input.startAt ?? ownership.startAt;
  const nextEnd = input.endAt === undefined ? ownership.endAt : input.endAt;
  if (nextEnd !== null && nextEnd.getTime() <= nextStart.getTime()) {
    throw new AppError('VALIDATION_ERROR', 'The corrected interval is invalid.');
  }
  try {
    await db.transaction(async (tx) => {
      const corrected = await correctOwnership(tx, input.ownershipId, {
        startAt: input.startAt,
        endAt: input.endAt,
      });
      if (corrected === null) throw new AppError('RESOURCE_NOT_FOUND');
      await writeAudit(tx, {
        actorId: actor.userId,
        action: 'ownership.corrected',
        resourceType: 'room_ownership',
        resourceId: input.ownershipId,
        requestId: ctx.requestId,
        before: {
          startAt: ownership.startAt.toISOString(),
          endAt: ownership.endAt === null ? null : ownership.endAt.toISOString(),
        },
        after: {
          startAt: corrected.startAt.toISOString(),
          endAt: corrected.endAt === null ? null : corrected.endAt.toISOString(),
          reason: input.reason,
        },
      });
    });
    return { ownershipId: input.ownershipId };
  } catch (error) {
    throw mapPgError(error, {
      constraintCodes: { room_ownership_no_overlap_ex: 'VALIDATION_ERROR' },
      fallbackCodes: { '23P01': 'VALIDATION_ERROR' },
    });
  }
}

export async function assertActorIsActiveOwner(
  roomId: string,
  userId: string,
  at: Date,
): Promise<void> {
  const ownerships = await listOwnershipsByRoom(db, roomId);
  if (!isOwnerAt(toIntervals(ownerships), roomId, userId, at)) {
    throw new AppError('ACCESS_DENIED');
  }
}
