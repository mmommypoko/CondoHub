import 'server-only';
import { PROJECT_PAYEE_ID } from '@/config/project';
import { and, desc, eq, lte } from 'drizzle-orm';
import type { Db } from '@/shared/db/transaction';
import { paymentInstruction, type PayeeType } from './schema';

export interface PaymentInstructionRecord {
  id: string;
  payeeType: PayeeType;
  payeeId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  qrImageId: string | null;
  effectiveFrom: Date;
}

function toRecord(row: typeof paymentInstruction.$inferSelect): PaymentInstructionRecord {
  return {
    id: row.id,
    payeeType: row.payeeType,
    payeeId: row.payeeId,
    bankName: row.bankName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
    qrImageId: row.qrImageId,
    effectiveFrom: row.effectiveFrom,
  };
}

export async function findPayeeEffectiveAt(
  conn: Db,
  input: { payeeType: PayeeType; payeeId: string; at: Date },
): Promise<PaymentInstructionRecord | null> {
  const rows = await conn
    .select()
    .from(paymentInstruction)
    .where(
      and(
        eq(paymentInstruction.payeeType, input.payeeType),
        eq(paymentInstruction.payeeId, input.payeeId),
        lte(paymentInstruction.effectiveFrom, input.at),
      ),
    )
    .orderBy(desc(paymentInstruction.effectiveFrom), desc(paymentInstruction.id))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : toRecord(row);
}

export async function insertPayeeInstruction(
  conn: Db,
  input: {
    payeeType: PayeeType;
    payeeId: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    qrImageId?: string | null | undefined;
    effectiveFrom: Date;
  },
): Promise<PaymentInstructionRecord> {
  const rows = await conn
    .insert(paymentInstruction)
    .values({
      payeeType: input.payeeType,
      payeeId: input.payeeId,
      bankName: input.bankName,
      accountName: input.accountName,
      accountNumber: input.accountNumber,
      qrImageId: input.qrImageId ?? null,
      effectiveFrom: input.effectiveFrom,
    })
    .returning();
  const row = rows[0];
  if (row === undefined) throw new Error('Payment instruction insert returned no row.');
  return toRecord(row);
}

export async function findPayeeInstructionById(
  conn: Db,
  id: string,
): Promise<PaymentInstructionRecord | null> {
  const [row] = await conn
    .select()
    .from(paymentInstruction)
    .where(eq(paymentInstruction.id, id))
    .limit(1);
  return row ? toRecord(row) : null;
}

export async function findInvoicePayee(
  conn: Db,
  input: { payeeType: 'PROJECT' | 'OWNER'; roomId: string; at: Date },
) {
  const scoped = await findPayeeEffectiveAt(conn, {
    payeeType: input.payeeType,
    payeeId: input.roomId,
    at: input.at,
  });
  if (scoped) return scoped;
  if (input.payeeType === 'PROJECT') {
    return findPayeeEffectiveAt(conn, {
      payeeType: 'PROJECT',
      payeeId: PROJECT_PAYEE_ID,
      at: input.at,
    });
  }
  return null;
}
