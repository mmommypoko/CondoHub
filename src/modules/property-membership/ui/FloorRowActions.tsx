'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button, Dialog, FormField, INPUT_CLASS, serverErrorMessage, useToast } from '@/shared/ui';

const editSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.').max(64),
  label: z.string().trim().min(1, 'Label is required.').max(255),
});

type EditValues = z.infer<typeof editSchema>;

export function FloorRowActions({
  floorId,
  code,
  label,
  roomCount,
}: {
  floorId: string;
  code: string;
  label: string;
  roomCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { code, label },
  });

  const onEdit = handleSubmit(async (values) => {
    setEditError(null);
    const response = await fetch(`/api/admin/floors/${floorId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: values.code, label: values.label }),
    });
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      setEditError(serverErrorMessage(payload, 'Could not update the floor.'));
      return;
    }
    setEditOpen(false);
    toast.success('Floor updated.');
    router.refresh();
  });

  async function confirmDelete(): Promise<void> {
    setDeleteError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/floors/${floorId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setDeleteError(serverErrorMessage(payload, 'Could not remove the floor.'));
        return;
      }
      setDeleteOpen(false);
      toast.success('Floor removed.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span className="flex flex-wrap gap-2">
        <Button
          data-testid={`floor-edit-open-${floorId}`}
          variant="secondary"
          size="sm"
          onClick={() => setEditOpen(true)}
        >
          Edit
        </Button>
        <Button
          data-testid={`floor-delete-open-${floorId}`}
          variant="destructive"
          size="sm"
          disabled={roomCount > 0}
          title={roomCount > 0 ? `Has ${roomCount} rooms` : undefined}
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </span>
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit floor"
        description="Update the floor code and label."
        size="sm"
        testId="floor-edit-dialog"
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="floor-edit-submit"
              loading={isSubmitting}
              onClick={() => void onEdit()}
            >
              Save floor
            </Button>
          </>
        }
      >
        <form
          data-testid="floor-edit-form"
          onSubmit={onEdit}
          noValidate
          className="flex flex-col gap-4"
        >
          {editError !== null ? (
            <p
              data-testid="floor-edit-error"
              role="alert"
              className="text-sm font-medium text-danger-foreground"
            >
              {editError}
            </p>
          ) : null}
          <FormField label="Code" htmlFor="floor-edit-code" error={errors.code?.message ?? ''} required>
            <input
              data-testid="floor-edit-code"
              type="text"
              required
              className={INPUT_CLASS}
              {...register('code')}
            />
          </FormField>
          <FormField label="Label" htmlFor="floor-edit-label" error={errors.label?.message ?? ''} required>
            <input
              data-testid="floor-edit-label"
              type="text"
              required
              className={INPUT_CLASS}
              {...register('label')}
            />
          </FormField>
        </form>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remove this floor?"
        description="The floor is removed permanently. Only empty floors can be removed."
        size="sm"
        testId="floor-delete-confirm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="floor-delete-submit"
              variant="destructive"
              loading={busy}
              onClick={() => void confirmDelete()}
            >
              Remove floor
            </Button>
          </>
        }
      >
        {deleteError !== null ? (
          <p
            data-testid="floor-delete-error"
            role="alert"
            className="text-sm font-medium text-danger-foreground"
          >
            {deleteError}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Floors with rooms cannot be removed. Move or remove the rooms first.
          </p>
        )}
      </Dialog>
    </>
  );
}
