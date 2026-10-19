'use client';

import { useEffect, useState } from 'react';
import { Expand, ImageOff } from 'lucide-react';
import { Lightbox, Skeleton } from '@/shared/ui';

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

  if (failed) {
    return (
      <p
        data-testid={`${testId}-unavailable`}
        className="flex h-44 w-full max-w-60 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-center text-sm text-muted-foreground"
      >
        <ImageOff aria-hidden="true" className="size-4 shrink-0" />
        Image unavailable.
      </p>
    );
  }

  if (url === null) {
    return (
      <Skeleton
        data-testid={`${testId}-loading`}
        aria-label="Loading image"
        className="h-44 w-full max-w-60"
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
        className="block h-44 w-full max-w-60 overflow-hidden rounded-lg border border-border bg-surface transition-[opacity,transform] duration-150 ease-out hover:opacity-90 focus-visible:outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <img
          data-testid={testId}
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </button>
      <Lightbox
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        src={url}
        alt={alt}
        title="Image preview"
        testId={`${testId}-preview`}
      />
      <span className="mt-1 inline-flex items-center gap-1 text-xs opacity-80">
        <Expand aria-hidden="true" className="size-3" />
        Select the image to preview it.
      </span>
    </div>
  );
}
