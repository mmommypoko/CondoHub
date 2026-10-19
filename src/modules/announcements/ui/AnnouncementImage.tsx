'use client';

import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Lightbox, Skeleton } from '@/shared/ui';

interface AccessEnvelope {
  data: { url: string; expiresAt: string };
}

export function AnnouncementImage({
  imageId,
  testId,
}: {
  imageId: string;
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
        className="flex items-center gap-2 text-sm text-muted-foreground"
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
        className="h-40"
      />
    );
  }
  return (
    <>
      <button
        type="button"
        data-testid={`${testId}-open`}
        onClick={() => setPreviewOpen(true)}
        aria-label="Enlarge announcement attachment"
        className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border bg-surface transition-[border-color,opacity] duration-150 ease-out hover:border-border-strong hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
      >
        <img
          data-testid={testId}
          src={url}
          alt="Announcement attachment"
          loading="lazy"
          className="h-auto max-h-96 w-full object-contain"
        />
      </button>
      <Lightbox
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        src={url}
        alt="Announcement attachment"
        title="Announcement attachment"
        testId={`${testId}-preview`}
      />
    </>
  );
}
