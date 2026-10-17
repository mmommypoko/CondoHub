'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { useToast } from '@/shared/ui/Toast';
import type { PaymentSubmissionDto } from '@/modules/billing-payments/application/index';
import { PaymentImage } from '@/modules/billing-payments/ui/PaymentImage';
import {
  paymentApproveFormSchema,
  paymentRejectFormSchema,
  type PaymentApproveFormValues,
  type PaymentRejectFormValues,
} from '@/modules/billing-payments/ui/paymentFormSchemas';

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

function submissionLabel(state: PaymentSubmissionDto['state']): string {
  if (state === 'APPROVED') return 'Approved';
  if (state === 'REJECTED') return 'Rejected';
  return 'Pending';
}

function submissionVariant(state: PaymentSubmissionDto['state']): 'success' | 'danger' | 'warning' {
  if (state === 'APPROVED') return 'success';
  if (state === 'REJECTED') return 'danger';
  return 'warning';
}

function formatInstant(value: string | null): string {
  if (value === null) return 'Not reviewed yet';
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reviewErrorCopy(code: string | undefined, fallback: string): string {
  if (code === 'PAYMENT_ALREADY_REVIEWED') return 'Someone reviewed this submission first. Reload the page.';
  if (code === 'PAYMENT_APPROVED_AMOUNT_EXCEEDS_OUTSTANDING') {
    return 'The approved amount is larger than the outstanding balance. Reload the page and retry.';
  }
  if (code === 'RESOURCE_NOT_FOUND' || code === 'ACCESS_DENIED') return 'This review is not available.';
  return fallback;
}

function ApproveForm({
  submissionId,
  outstanding,
  onDone,
}: {
  submissionId: string;
  outstanding: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PaymentApproveFormValues>({
    resolver: zodResolver(paymentApproveFormSchema),
    defaultValues: { amount: '' },
  });
  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      const response = await fetch(`/api/payment-submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ amount: { amount: values.amount.trim(), currency: 'THB' } }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(
          reviewErrorCopy(payload?.error?.code, payload?.error?.message ?? 'Could not approve the submission.'),
        );
        return;
      }
      toast.success('Submission approved.');
      onDone();
    },
    () => setFocus('amount'),
  );
  return (
    <form
      data-testid={`payment-approve-form-${submissionId}`}
      onSubmit={onSubmit}
      noValidate
      className="flex min-w-0 flex-col gap-2"
    >
      {serverError !== null ? (
        <p data-testid={`payment-approve-error-${submissionId}`} role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`payment-approve-amount-${submissionId}`} className="text-sm font-medium text-foreground">
          Approved amount (THB)
        </label>
        <input
          id={`payment-approve-amount-${submissionId}`}
          data-testid={`payment-approve-amount-${submissionId}`}
          type="text"
          inputMode="decimal"
          placeholder="3000.00"
          aria-invalid={errors.amount !== undefined}
          aria-describedby={errors.amount !== undefined ? `payment-approve-amount-error-${submissionId}` : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('amount')}
        />
        <p className="text-xs text-muted-foreground">Outstanding balance: {outstanding} THB.</p>
        {errors.amount !== undefined ? (
          <p id={`payment-approve-amount-error-${submissionId}`} data-testid={`payment-approve-amount-error-${submissionId}`} role="alert" className="text-sm text-danger">
            {errors.amount.message}
          </p>
        ) : null}
      </div>
      <div>
        <Button data-testid={`payment-approve-submit-${submissionId}`} type="submit" loading={isSubmitting} size="sm">
          Approve
        </Button>
      </div>
    </form>
  );
}

function RejectForm({ submissionId, onDone }: { submissionId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PaymentRejectFormValues>({
    resolver: zodResolver(paymentRejectFormSchema),
    defaultValues: { reason: '' },
  });
  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      const response = await fetch(`/api/payment-submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ reason: values.reason.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
        setServerError(
          reviewErrorCopy(payload?.error?.code, payload?.error?.message ?? 'Could not reject the submission.'),
        );
        return;
      }
      toast.success('Submission rejected.');
      onDone();
    },
    () => setFocus('reason'),
  );
  return (
    <form
      data-testid={`payment-reject-form-${submissionId}`}
      onSubmit={onSubmit}
      noValidate
      className="flex min-w-0 flex-col gap-2"
    >
      {serverError !== null ? (
        <p data-testid={`payment-reject-error-${submissionId}`} role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={`payment-reject-reason-${submissionId}`} className="text-sm font-medium text-foreground">
          Rejection reason
        </label>
        <input
          id={`payment-reject-reason-${submissionId}`}
          data-testid={`payment-reject-reason-${submissionId}`}
          type="text"
          maxLength={2000}
          aria-invalid={errors.reason !== undefined}
          aria-describedby={errors.reason !== undefined ? `payment-reject-reason-error-${submissionId}` : undefined}
          className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          {...register('reason')}
        />
        {errors.reason !== undefined ? (
          <p id={`payment-reject-reason-error-${submissionId}`} data-testid={`payment-reject-reason-error-${submissionId}`} role="alert" className="text-sm text-danger">
            {errors.reason.message}
          </p>
        ) : null}
      </div>
      <div>
        <Button
          data-testid={`payment-reject-submit-${submissionId}`}
          type="submit"
          variant="destructive"
          loading={isSubmitting}
          size="sm"
        >
          Reject
        </Button>
      </div>
    </form>
  );
}

export function PaymentSubmissionCard({
  submission,
  outstanding,
  approveBlocked,
  onReviewed,
}: {
  submission: PaymentSubmissionDto;
  outstanding: string;
  approveBlocked: boolean;
  onReviewed: () => void;
}) {
  const [mode, setMode] = useState<'none' | 'approve' | 'reject'>('none');
  return (
    <li
      data-testid={`payment-submission-${submission.id}`}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all text-xs text-muted-foreground">{submission.id}</span>
        <Badge data-testid={`payment-submission-state-${submission.id}`} variant={submissionVariant(submission.state)}>
          {submissionLabel(submission.state)}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {submission.approvedAmount !== null ? (
          <span>Approved {submission.approvedAmount.amount} {submission.approvedAmount.currency}</span>
        ) : null}
        <span>{formatInstant(submission.reviewedAt)}</span>
      </div>
      {submission.rejectReason !== null ? (
        <p data-testid={`payment-submission-reason-${submission.id}`} className="break-words text-sm text-foreground">
          Reason: {submission.rejectReason}
        </p>
      ) : null}
      <PaymentImage
        imageId={submission.imageId}
        alt="Payment slip attachment"
        testId={`payment-submission-slip-${submission.id}`}
      />
      {submission.state === 'PENDING' ? (
        <div className="flex min-w-0 flex-col gap-3">
          {approveBlocked ? (
            <p data-testid={`payment-approve-blocked-${submission.id}`} role="alert" className="text-sm text-warning-foreground">
              This invoice is already paid. Pending slips can only be rejected.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!approveBlocked ? (
              <Button
                data-testid={`payment-approve-toggle-${submission.id}`}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setMode(mode === 'approve' ? 'none' : 'approve')}
              >
                Approve
              </Button>
            ) : null}
            <Button
              data-testid={`payment-reject-toggle-${submission.id}`}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMode(mode === 'reject' ? 'none' : 'reject')}
            >
              Reject
            </Button>
          </div>
          {mode === 'approve' && !approveBlocked ? (
            <ApproveForm submissionId={submission.id} outstanding={outstanding} onDone={onReviewed} />
          ) : null}
          {mode === 'reject' ? <RejectForm submissionId={submission.id} onDone={onReviewed} /> : null}
        </div>
      ) : null}
    </li>
  );
}
