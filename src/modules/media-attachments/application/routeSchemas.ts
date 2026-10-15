import { z } from 'zod';
import { AppError, type FieldErrors } from '@/shared/utils/errors';

export const imageIntentBody = z
  .object({
    scope: z.enum(['PAYMENT_SLIP', 'PAYMENT_QR', 'MAINTENANCE', 'ANNOUNCEMENT', 'CHAT']),
    entityRef: z
      .object({
        type: z.string().min(1).max(64),
        id: z.string().uuid().nullable(),
      })
      .strict(),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    fileName: z.string().min(1).max(255),
  })
  .strict();

export type ImageIntentBody = z.infer<typeof imageIntentBody>;

export const imageCompleteBody = z.object({}).strict();

export type ImageCompleteBody = z.infer<typeof imageCompleteBody>;

export function parseWithFieldErrors<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    const list = fieldErrors[key] ?? [];
    list.push(issue.message);
    fieldErrors[key] = list;
  }
  throw new AppError('VALIDATION_ERROR', undefined, { fieldErrors });
}
