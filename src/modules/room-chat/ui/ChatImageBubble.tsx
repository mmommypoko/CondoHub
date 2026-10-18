'use client';

import { useEffect, useState } from 'react';
import { Expand, ImageOff, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface AccessEnvelope {
  data: { url: string; expiresAt: string };
}

export function ChatImageBubble({
  imageId,
  alt,
  testId,
}: {
  imageId: string;
  alt: string;
  testId: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const response = await fetch(`/api/images/${imageId}/access`);
        if (!response.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const envelope = (await response.json()) as AccessEnvelope;
        if (!cancelled) setUrl(envelope.data.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [imageId]);

  useEffect(() => {
    if (!previewOpen) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setPreviewOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewOpen]);

  if (failed) {
    return (
      <p
        data-testid={`${testId}-unavailable`}
        className="flex h-44 w-full max-w-xs items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm text-muted-foreground"
      >
        <ImageOff aria-hidden="true" className="size-4 shrink-0" />
        Image unavailable.
      </p>
    );
  }

  if (url === null) {
    return (
      <div
        data-testid={`${testId}-loading`}
        role="status"
        aria-label="Loading image"
        className="h-44 w-full max-w-xs animate-pulse rounded-lg bg-skeleton"
      />
    );
  }

  return (
    <div className="min-w-0">
      <button
        data-testid={`${testId}-open`}
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label="Open image preview"
        className="block h-44 w-full max-w-xs overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <img
          data-testid={testId}
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </button>
      {previewOpen ? (
        <div
          data-testid={`${testId}-preview`}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="flex max-h-full min-w-0 max-w-3xl flex-col gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-end">
              <Button
                data-testid={`${testId}-preview-close`}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewOpen(false)}
              >
                <X aria-hidden="true" className="size-4" />
                Close preview
              </Button>
            </div>
            <img
              data-testid={`${testId}-preview-image`}
              src={url}
              alt={alt}
              className="max-h-[75vh] w-auto max-w-full rounded-lg border border-border object-contain"
            />
          </div>
        </div>
      ) : null}
      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Expand aria-hidden="true" className="size-3" />
        Select the image to preview it.
      </span>
    </div>
  );
}
