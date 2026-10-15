import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import type { Tx } from '@/shared/db/transaction';
import { AppError } from '@/shared/utils/errors';
import type { ImageScope } from '@/shared/storage/objectKeys';
import { attachImages, listImagesByIds } from '../infrastructure/imageRepository';

export interface CommitAttachmentsOptions {
  scope: ImageScope;
  entityRef: { type: string; id: string };
  imageIds: string[];
  maxCount: number;
  at: Date;
}

export async function commitAttachments(
  tx: Tx,
  actor: Actor,
  opts: CommitAttachmentsOptions,
): Promise<void> {
  if (actor.accountStatus !== 'ACTIVE') throw new AppError('ACCESS_DENIED');
  if (actor.mustChangePassword) throw new AppError('FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED');
  const uniqueIds = [...new Set(opts.imageIds)];
  if (uniqueIds.length !== opts.imageIds.length) {
    throw new AppError('VALIDATION_ERROR', 'Duplicate image ids are not allowed.');
  }
  if (uniqueIds.length > opts.maxCount) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Too many images. The maximum is ${opts.maxCount}.`,
    );
  }
  if (uniqueIds.length === 0) return;
  const images = await listImagesByIds(tx, uniqueIds);
  if (images.length !== uniqueIds.length) {
    throw new AppError('VALIDATION_ERROR', 'One or more images were not found.');
  }
  for (const image of images) {
    if (image.state !== 'READY') {
      throw new AppError('VALIDATION_ERROR', 'Only verified images can be attached.');
    }
    if (image.scope !== opts.scope) {
      throw new AppError('VALIDATION_ERROR', 'The image scope does not match.');
    }
    if (image.uploadedBy !== actor.userId) {
      throw new AppError('VALIDATION_ERROR', 'Only your own images can be attached.');
    }
  }
  await attachImages(tx, uniqueIds, opts.entityRef, opts.at);
}
