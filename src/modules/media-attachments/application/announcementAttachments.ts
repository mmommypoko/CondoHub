import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import type { Db, Tx } from '@/shared/db/transaction';
import { AppError } from '@/shared/utils/errors';
import {
  detachImages,
  listAnnouncementImages,
} from '../infrastructure/imageRepository';
import { commitAttachments } from './commitAttachments';
import type { AttachedImageDto } from './attachedImages';
import { listAttachedImagesForEntity } from './attachedImages';

export async function listAnnouncementAttachments(
  conn: Db,
  announcementId: string,
): Promise<AttachedImageDto[]> {
  return listAttachedImagesForEntity(conn, { type: 'announcement', id: announcementId });
}

export interface ReplaceAnnouncementAttachmentsInput {
  imageIds: string[];
  maxCount: number;
  at: Date;
}

export async function replaceAnnouncementAttachments(
  tx: Tx,
  actor: Actor,
  announcementId: string,
  input: ReplaceAnnouncementAttachmentsInput,
): Promise<{ currentIds: string[] }> {
  if (actor.accountStatus !== 'ACTIVE') throw new AppError('ACCESS_DENIED');
  if (actor.mustChangePassword) throw new AppError('FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED');
  const current = await listAnnouncementImages(tx, announcementId);
  const currentIds = current.map((image) => image.id);
  const wanted = [...new Set(input.imageIds)];
  const toDetach = currentIds.filter((id) => !wanted.includes(id));
  const toAttach = wanted.filter((id) => !currentIds.includes(id));
  await detachImages(tx, toDetach);
  await commitAttachments(tx, actor, {
    scope: 'ANNOUNCEMENT',
    entityRef: { type: 'announcement', id: announcementId },
    imageIds: toAttach,
    maxCount: input.maxCount - (currentIds.length - toDetach.length),
    at: input.at,
  });
  return { currentIds };
}
