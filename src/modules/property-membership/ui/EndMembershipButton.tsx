'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dialog, serverErrorMessage, useToast } from '@/shared/ui';

export function EndMembershipButton({
  roomId,
  membershipId,
}: {
  roomId: string;
  membershipId: string;
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
      const response = await fetch(`/api/rooms/${roomId}/members/${membershipId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'END' }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setServerError(serverErrorMessage(payload, 'Could not end the membership.'));
        return;
      }
      setConfirmOpen(false);
      toast.success('Membership ended.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        data-testid={`room-membership-end-${membershipId}`}
        variant="secondary"
        size="sm"
        onClick={() => setConfirmOpen(true)}
      >
        End
      </Button>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="End this membership?"
        description="The member loses room access immediately. History is kept."
        size="sm"
        testId="room-membership-end-confirm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="room-membership-end-submit"
              variant="destructive"
              loading={busy}
              onClick={() => void confirm()}
            >
              End membership
            </Button>
          </>
        }
      >
        {serverError !== null ? (
          <p
            data-testid="room-membership-end-error"
            role="alert"
            className="text-sm font-medium text-danger-foreground"
          >
            {serverError}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            The membership interval closes now. Past activity stays recorded.
          </p>
        )}
      </Dialog>
    </>
  );
}
