'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/shared/ui';
import type {
  InvoiceDto,
  InvoiceRevisionDto,
  PaymentInstructionDto,
  PaymentSubmissionDto,
} from '@/modules/billing-payments/application/index';
import { PaymentImage } from '@/modules/billing-payments/ui/PaymentImage';
import { PaymentSubmissionCard } from '@/modules/billing-payments/ui/PaymentSubmissionCard';
import { PaymentSubmitForm } from '@/modules/billing-payments/ui/PaymentSubmitForm';
import { InvoiceEditForm } from '@/modules/billing-payments/ui/InvoiceEditForm';
import { formatInstant, invoiceStateLabel, invoiceStateVariant } from '@/modules/billing-payments/ui/billingLabels';

export function InvoicePaymentSections({
  invoice,
  submissions,
  revisions,
  instruction,
  actorIsAdmin,
}: {
  invoice: InvoiceDto;
  submissions: PaymentSubmissionDto[];
  revisions: InvoiceRevisionDto[];
  instruction: PaymentInstructionDto | null;
  actorIsAdmin: boolean;
}) {
  const router = useRouter();
  const refresh = (): void => router.refresh();
  const paid = invoice.state === 'PAID';
  const pendingSubmissions = submissions.filter((submission) => submission.state === 'PENDING');
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-label="Balance" className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Balance</h2>
          <Badge data-testid="invoice-payment-state" variant={invoiceStateVariant(invoice.state)}>
            {invoiceStateLabel(invoice.state)}
          </Badge>
          {invoice.overdue ? (
            <Badge data-testid="invoice-payment-overdue" variant="danger">
              Overdue
            </Badge>
          ) : null}
        </div>
        {invoice.pendingOnPaid ? (
          <p data-testid="invoice-payment-pending-on-paid" role="alert" className="rounded-xl border border-warning-border bg-warning p-3 text-sm leading-6 text-warning-foreground">
            This invoice is already paid, but payment slips are still awaiting review. Reject the
            pending slips so the queue stays accurate.
          </p>
        ) : null}
        <dl
          data-testid="invoice-payment-facts"
          className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm sm:grid-cols-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">
              Outstanding
            </dt>
            <dd data-testid="invoice-payment-outstanding" className="break-words text-xl font-semibold tracking-tight text-foreground tabular-nums">
              {invoice.outstanding.amount} {invoice.outstanding.currency}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">
              Approved
            </dt>
            <dd data-testid="invoice-payment-approved" className="break-words font-medium text-foreground tabular-nums">
              {invoice.approvedTotal.amount} {invoice.approvedTotal.currency}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm font-medium text-muted-foreground">
              Pending slips
            </dt>
            <dd data-testid="invoice-payment-pending-count" className="break-words font-medium text-foreground tabular-nums">
              {pendingSubmissions.length}
            </dd>
          </div>
        </dl>
      </section>
      {instruction !== null ? (
        <section aria-label="Payment instruction" className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">How to pay</h2>
          <dl
            data-testid="invoice-payment-instruction"
            className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm font-medium text-muted-foreground">
                Bank
              </dt>
              <dd data-testid="invoice-payment-bank" className="break-words font-medium text-foreground">
                {instruction.bankName}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm font-medium text-muted-foreground">
                Account name
              </dt>
              <dd data-testid="invoice-payment-account-name" className="break-words font-medium text-foreground">
                {instruction.accountName}
              </dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-sm font-medium text-muted-foreground">
                Account number
              </dt>
              <dd data-testid="invoice-payment-account-number" className="break-words font-medium text-foreground tabular-nums">
                {instruction.accountNumber}
              </dd>
            </div>
          </dl>
          {instruction.qrImageId !== null ? (
            <PaymentImage
              imageId={instruction.qrImageId}
              alt="Payment QR code"
              testId="invoice-payment-qr"
            />
          ) : null}
        </section>
      ) : null}
      {!actorIsAdmin && !paid ? (
        <section aria-label="Submit a payment slip" className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Submit a payment slip</h2>
          <PaymentSubmitForm invoiceId={invoice.id} onSubmitted={refresh} />
        </section>
      ) : null}
      <section aria-label="Payment submissions" className="flex min-w-0 flex-col gap-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Payment slips</h2>
        {submissions.length === 0 ? (
          <p data-testid="invoice-payment-submissions-empty" className="text-sm leading-6 text-muted-foreground">
            No payment slips yet.
          </p>
        ) : (
          <ul data-testid="invoice-payment-submissions" className="flex min-w-0 flex-col gap-3">
            {submissions.map((submission) => (
              <PaymentSubmissionCard
                key={submission.id}
                submission={submission}
                outstanding={invoice.outstanding.amount}
                approveBlocked={paid}
                onReviewed={refresh}
              />
            ))}
          </ul>
        )}
      </section>
      {!paid ? (
        <section aria-label="Edit invoice total" className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Edit total</h2>
          <InvoiceEditForm
            invoiceId={invoice.id}
            version={invoice.version}
            currentTotal={invoice.total.amount}
            onEdited={refresh}
          />
        </section>
      ) : null}
      <section aria-label="Total history" className="flex min-w-0 flex-col gap-4">
        <h2 className="text-base font-semibold tracking-tight text-foreground">Total history</h2>
        {revisions.length === 0 ? (
          <p data-testid="invoice-payment-revisions-empty" className="text-sm leading-6 text-muted-foreground">
            The total has not changed since this invoice was issued.
          </p>
        ) : (
          <ul data-testid="invoice-payment-revisions" className="flex min-w-0 flex-col gap-3">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                data-testid={`invoice-payment-revision-${revision.id}`}
                className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-sm"
              >
                <p className="break-words font-medium text-foreground tabular-nums">
                  {revision.oldTotal.amount} {revision.oldTotal.currency} to {revision.newTotal.amount}{' '}
                  {revision.newTotal.currency}
                </p>
                {revision.reason !== null && revision.reason !== '' ? (
                  <p className="break-words leading-6 text-foreground">{revision.reason}</p>
                ) : null}
                <p className="break-all text-xs leading-6 text-muted-foreground tabular-nums">
                  {formatInstant(revision.changedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
