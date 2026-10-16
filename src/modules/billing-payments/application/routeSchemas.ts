import 'server-only';
import { z } from 'zod';
import { parseWithFieldErrors as sharedParseWithFieldErrors } from '@/shared/utils/parseBody';
import { moneyWireSchema } from '@/shared/utils/moneySchema';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const calendarDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

export const generateInvoicesJobBody = z
  .object({
    triggerSource: z.enum(['CRON', 'MANUAL', 'STARTUP_DEFERRED']),
    fromCycle: yearMonth.optional(),
    toCycle: yearMonth.optional(),
    batchSize: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export type GenerateInvoicesJobBody = z.infer<typeof generateInvoicesJobBody>;

export const commonFeeEventCreateBody = z
  .object({
    sourceRuleId: z.string().uuid().nullable().optional(),
    eventEffectiveDate: calendarDate,
    configuredAmount: moneyWireSchema.nullable().optional(),
    chargeContext: z.record(z.string(), z.unknown()).nullable().optional(),
    status: z.enum(['OPEN', 'ISSUED', 'CANCELLED']).default('OPEN'),
  })
  .strict();

export type CommonFeeEventCreateBody = z.infer<typeof commonFeeEventCreateBody>;

export const invoiceListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  roomId: z.string().uuid().optional(),
  kind: z.enum(['PRIVATE_RENT', 'PROJECT_MANAGED_RENT', 'COMMON_FEE']).optional(),
});

export type InvoiceListQuery = z.infer<typeof invoiceListQuery>;

export const jobRunListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  jobName: z.enum(['generate-invoices', 'sweep-orphans']).optional(),
  state: z.enum(['RUNNING', 'DONE', 'ERROR']).optional(),
});

export type JobRunListQuery = z.infer<typeof jobRunListQuery>;

export function parseWithFieldErrors<T>(schema: z.ZodType<T>, value: unknown): T {
  return sharedParseWithFieldErrors(schema, value);
}
