'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

export interface SlipUpload {
  imageId: string;
  fileName: string;
  byteSize: number;
  mimeVerified: string;
}

interface IntentEnvelope {
  data: { imageId: string; uploadUrl: string; expiresAt: string };
}

interface CompleteEnvelope {
  data: { imageId: string; byteSize: number; mimeVerified: string };
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function putBytes(url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(file);
  });
}

export function PaymentSlipUploader({
  slip,
  onChange,
  testIdPrefix,
}: {
  slip: SlipUpload | null;
  onChange: (slip: SlipUpload | null) => void;
  testIdPrefix: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<void> {
    if (!ACCEPTED.includes(file.type)) {
      setError('Unsupported file type. Supported types: JPEG, PNG, WebP.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const intentResponse = await fetch('/api/images/intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'PAYMENT_SLIP',
          entityRef: { type: 'payment_submission', id: null },
          contentType: file.type,
          fileName: file.name.slice(0, 255),
        }),
      });
      if (!intentResponse.ok) {
        const payload = (await intentResponse.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(payload?.error.message ?? 'Could not start the upload.');
      }
      const intent = (await intentResponse.json()) as IntentEnvelope;
      await putBytes(intent.data.uploadUrl, file);
      const completeResponse = await fetch(`/api/images/${intent.data.imageId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!completeResponse.ok) {
        const payload = (await completeResponse.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(payload?.error.message ?? 'The image could not be verified.');
      }
      const completed = (await completeResponse.json()) as CompleteEnvelope;
      onChange({
        imageId: completed.data.imageId,
        fileName: file.name,
        byteSize: completed.data.byteSize,
        mimeVerified: completed.data.mimeVerified,
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current !== null) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Payment slip (1 required)</span>
        <Button
          data-testid={`${testIdPrefix}-upload-btn`}
          type="button"
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          {slip === null ? 'Add slip' : 'Replace slip'}
        </Button>
      </div>
      <input
        ref={inputRef}
        data-testid={`${testIdPrefix}-upload-input`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a payment slip image to upload"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void uploadFile(file);
        }}
      />
      <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Up to 10 MB.</p>
      {busy ? (
        <p data-testid={`${testIdPrefix}-upload-progress`} role="status" className="text-sm text-muted-foreground">
          Uploading the slip image.
        </p>
      ) : null}
      {error !== null ? (
        <p data-testid={`${testIdPrefix}-upload-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {slip !== null ? (
        <div
          data-testid={`${testIdPrefix}-slip-ready`}
          className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-2 text-sm"
        >
          <span className="min-w-0 truncate text-foreground">{slip.fileName}</span>
          <Button
            data-testid={`${testIdPrefix}-remove-slip`}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove ${slip.fileName}`}
            onClick={() => onChange(null)}
          >
            <X aria-hidden="true" className="size-4" />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
