'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, serverErrorMessage, useToast } from '@/shared/ui';

export function TenancyEndButton({
  roomId,
  tenancyId,
}: {
  roomId: string;
  tenancyId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm(): Promise<void> {
    setServerError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/tenancies/${tenancyId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'END' }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setServerError(serverErrorMessage(payload, 'Could not end the tenancy.'));
        return;
      }
      setConfirmOpen(false);
      toast.success('Tenancy ended.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        data-testid={`room-tenancy-end-${tenancyId}`}
        variant="secondary"
        size="sm"
        onClick={() => setConfirmOpen(true)}
      >
        End
      </Button>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="End this tenancy?"
        description="Active memberships under this tenancy end as well. History is kept."
        size="sm"
        testId="room-tenancy-end-confirm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="room-tenancy-end-submit"
              variant="destructive"
              loading={busy}
              onClick={() => void confirm()}
            >
              End tenancy
            </Button>
          </>
        }
      >
        {serverError !== null ? (
          <p
            data-testid="room-tenancy-end-error"
            role="alert"
            className="text-sm font-medium text-danger-foreground"
          >
            {serverError}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            The rental period closes now. Linked memberships end with it.
          </p>
        )}
      </Dialog>
    </>
  );
}
