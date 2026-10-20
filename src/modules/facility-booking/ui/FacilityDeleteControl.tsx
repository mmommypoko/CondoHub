'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button, Dialog, serverErrorMessage, useToast } from '@/shared/ui';

export function FacilityDeleteControl({ facilityId, name }: { facilityId: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/facilities/${facilityId}`, {
        method: 'DELETE',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      if (!response.ok) {
        setError(
          serverErrorMessage(
            await response.json().catch(() => null),
            'Could not delete the facility.',
          ),
        );
        return;
      }
      setOpen(false);
      toast.success('Facility deleted.');
      router.push('/admin/facilities');
      router.refresh();
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        data-testid="facility-delete-open"
        variant="destructive"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 aria-hidden="true" className="size-4" />
        Delete facility
      </Button>
      <Dialog
        open={open}
        busy={busy}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Delete this facility?"
        description={`${name} will be removed from the facilities directory. Booking history stays recorded. Cancel active or upcoming bookings before deleting.`}
        testId="facility-delete-dialog"
        size="sm"
        actions={
          <>
            <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="facility-delete-submit"
              variant="destructive"
              loading={busy}
              onClick={() => void remove()}
            >
              Delete facility
            </Button>
          </>
        }
      >
        {error ? (
          <p
            data-testid="facility-delete-error"
            role="alert"
            className="text-body text-danger-foreground"
          >
            {error}
          </p>
        ) : (
          <p className="text-body leading-relaxed text-muted-foreground">
            This facility will no longer be available for new bookings.
          </p>
        )}
      </Dialog>
    </>
  );
}
