import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { AppError } from '@/shared/utils/errors';
import { evaluateSessionGate } from '../domain/sessionPolicy';
import { deleteUserSessions, findUserById } from '../infrastructure/userRepository';

export interface ActiveActor {
  userId: string;
  accountStatus: 'ACTIVE';
  mustChangePassword: false;
}

export async function requireActiveAccount(actorId: string): Promise<ActiveActor> {
  const target = await findUserById(db, actorId);
  if (target === null) throw new AppError('AUTH_REQUIRED');
  const candidate: Actor = {
    userId: target.id,
    isSystemAdmin: target.isSystemAdmin,
    accountStatus: target.accountStatus,
    mustChangePassword: target.mustChangePassword,
  };
  const outcome = evaluateSessionGate(candidate);
  if (outcome === 'SUSPENDED') throw new AppError('ACCESS_DENIED');
  if (outcome === 'FIRST_LOGIN') throw new AppError('FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED');
  return { userId: target.id, accountStatus: 'ACTIVE', mustChangePassword: false };
}

export async function isSystemAdmin(actorId: string): Promise<boolean> {
  const target = await findUserById(db, actorId);
  if (target === null) throw new AppError('AUTH_REQUIRED');
  return target.isSystemAdmin;
}

export async function revokeAllSessions(userId: string): Promise<{ revoked: number }> {
  const target = await findUserById(db, userId);
  if (target === null) throw new AppError('AUTH_REQUIRED');
  const revoked = await db.transaction(async (tx) => deleteUserSessions(tx, userId));
  return { revoked };
}
