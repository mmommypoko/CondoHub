import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import type {
  ScopeAclCallback,
  ScopeAclImage,
  ScopeAclVerdict,
} from '@/modules/media-attachments/domain/scopeAcl';
import { registerScopeAcl } from '@/modules/media-attachments/application/index';
import { db } from '@/shared/db/client';
import type { Db } from '@/shared/db/transaction';
import { AppError } from '@/shared/utils/errors';
import { canActInRoom } from '@/modules/property-membership/application/index';
import { evaluateChatAccess } from '../domain/chatPolicy';
import { resolveMessageRoom } from './messageReads';

async function decideForMessage(
  actor: Actor,
  messageId: string,
  at: Date,
  conn: Db,
): Promise<ScopeAclVerdict> {
  const resolved = await resolveMessageRoom(messageId, conn);
  if (resolved === null) return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  if (actor.isSystemAdmin) return { allowed: true };
  const verdict = await canActInRoom(actor.userId, resolved.roomId, 'VIEW_CHAT', at).catch(
    (error: unknown) => {
      if (error instanceof AppError && error.code === 'RESOURCE_NOT_FOUND') return null;
      throw error;
    },
  );
  if (verdict === null) return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  const policy = evaluateChatAccess(
    { actorIsSystemAdmin: false, actorHasCurrentRoomAccess: verdict.allowed },
    'VIEW_IMAGE',
  );
  return policy.allowed ? { allowed: true } : { allowed: false, reason: 'NO_CURRENT_ACCESS' };
}

export const chatScopeAcl: ScopeAclCallback = async (
  actor: Actor,
  image: ScopeAclImage,
  at: Date,
  conn?: Db | undefined,
): Promise<ScopeAclVerdict> => {
  const reader = conn ?? db;
  if (actor.accountStatus !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
  if (actor.mustChangePassword) return { allowed: false, reason: 'FIRST_LOGIN_REQUIRED' };
  if (image.entityRef === null) return { allowed: true };
  if (image.entityRef.type !== 'chat_message') return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  return decideForMessage(actor, image.entityRef.id, at, reader);
};

export function wireChatScopeAcl(): void {
  registerScopeAcl('CHAT', chatScopeAcl);
}
