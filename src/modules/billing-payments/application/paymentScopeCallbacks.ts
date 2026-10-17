import 'server-only';
import type { Actor } from '@/shared/auth/actor';
import type {
  ScopeAclCallback,
  ScopeAclImage,
  ScopeAclVerdict,
} from '@/modules/media-attachments/domain/scopeAcl';
import { registerScopeAcl } from '@/modules/media-attachments/application/index';
import { db } from '@/shared/db/client';
import { evaluateInvoiceAccess, type InvoiceQueueAction } from '../domain/invoicePolicy';
import { deriveInvoiceState } from '../domain/paymentState';
import {
  findInvoiceById,
  isFeeResponsibleOwner,
  isRentReviewer,
  readInvoiceBalance,
  tenantOverlapsInvoice,
} from '../infrastructure/invoiceRepository';
import { listMembershipWindowsByUser } from '@/modules/property-membership/application/index';

async function decideForInvoice(
  actor: Actor,
  invoiceId: string,
  at: Date,
  action: InvoiceQueueAction,
): Promise<ScopeAclVerdict> {
  if (actor.accountStatus !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
  if (actor.mustChangePassword) return { allowed: false, reason: 'FIRST_LOGIN_REQUIRED' };
  const row = await findInvoiceById(db, invoiceId);
  if (row === null) return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  if (row.kind === 'PRIVATE_RENT' && actor.isSystemAdmin) {
    return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  }
  const [rentReviewer, feeResponsible, tenantOverlap, membershipResident, balance] =
    await Promise.all([
      row.kind === 'PRIVATE_RENT'
        ? isRentReviewer(db, { invoiceId: row.id, userId: actor.userId })
        : Promise.resolve(false),
      row.kind === 'COMMON_FEE'
        ? isFeeResponsibleOwner(db, { invoiceId: row.id, userId: actor.userId })
        : Promise.resolve(false),
      row.tenancyId === null
        ? Promise.resolve(false)
        : tenantOverlapsInvoice(db, {
            userId: actor.userId,
            tenancyId: row.tenancyId,
            serviceStart: row.serviceStart,
            serviceEndExclusive: row.serviceEndExclusive,
          }),
      row.kind === 'COMMON_FEE'
        ? listMembershipWindowsByUser(actor.userId)
            .then((windows) =>
              windows.some(
                (window) =>
                  window.roomId === row.roomId &&
                  window.start.getTime() <= at.getTime() &&
                  (window.end === null || window.end.getTime() > at.getTime()),
              ),
            )
            .catch(() => false)
        : Promise.resolve(false),
      db.transaction((tx) => readInvoiceBalance(tx, row.id)),
    ]);
  const verdict = evaluateInvoiceAccess(
    {
      kind: row.kind,
      actorIsSystemAdmin: actor.isSystemAdmin,
      actorSuspended: false,
      actorMustChangePassword: false,
      inRentReviewerSnapshot: rentReviewer,
      inFeeResponsibleSnapshot: feeResponsible,
      tenantOverlap,
      activeResidentOfRoom: membershipResident,
      currentOwnerOfRoom: false,
      invoicePaid: deriveInvoiceState(row.total, balance.approvedTotal) === 'PAID',
      pendingOnInvoice: balance.pendingCount > 0,
    },
    action,
  );
  return verdict.allowed ? { allowed: true } : { allowed: false, reason: 'NO_CURRENT_ACCESS' };
}

export const paymentSlipScopeAcl: ScopeAclCallback = async (
  actor: Actor,
  image: ScopeAclImage,
  at: Date,
): Promise<ScopeAclVerdict> => {
  if (image.entityRef === null) {
    if (actor.accountStatus !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
    if (actor.mustChangePassword) return { allowed: false, reason: 'FIRST_LOGIN_REQUIRED' };
    return { allowed: true };
  }
  if (image.entityRef.type !== 'payment_submission') {
    return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  }
  const { findSubmissionById } = await import(
    '../infrastructure/paymentSubmissionRepository'
  );
  const submission = await findSubmissionById(db, image.entityRef.id);
  if (submission === null) return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  return decideForInvoice(actor, submission.invoiceId, at, 'VIEW_SLIP');
};

export const paymentQrScopeAcl: ScopeAclCallback = async (
  actor: Actor,
  image: ScopeAclImage,
  at: Date,
): Promise<ScopeAclVerdict> => {
  if (actor.accountStatus !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_SUSPENDED' };
  if (actor.mustChangePassword) return { allowed: false, reason: 'FIRST_LOGIN_REQUIRED' };
  if (image.entityRef === null) {
    return actor.isSystemAdmin ? { allowed: true } : { allowed: false, reason: 'ADMIN_ONLY' };
  }
  if (image.entityRef.type !== 'invoice') {
    return { allowed: false, reason: 'NO_CURRENT_ACCESS' };
  }
  return decideForInvoice(actor, image.entityRef.id, at, 'VIEW_QR');
};

export function wirePaymentScopeAcl(): void {
  registerScopeAcl('PAYMENT_SLIP', paymentSlipScopeAcl);
  registerScopeAcl('PAYMENT_QR', paymentQrScopeAcl);
}
