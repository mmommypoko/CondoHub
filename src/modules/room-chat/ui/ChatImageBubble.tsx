'use client';

import { Expand } from 'lucide-react';
import { SecureImage } from '@/shared/ui';

export function ChatImageBubble({
  imageId,
  alt,
  testId,
}: {
  imageId: string;
  alt: string;
  testId: string;
}) {
  return (
    <div className="min-w-0">
      <SecureImage
        imageId={imageId}
        alt={alt}
        enlargeLabel="Open image preview"
        lightboxTitle="Image preview"
        testId={testId}
        buttonClassName="block h-44 w-full max-w-60 overflow-hidden rounded-lg border border-border bg-surface transition-[opacity,transform] duration-150 ease-out hover:opacity-90 focus-visible:outline-none motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        imgClassName="h-full w-full object-cover"
        skeletonClassName="h-44 w-full max-w-60"
        failedClassName="flex h-44 w-full max-w-60 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-center text-small leading-small text-muted-foreground"
      />
      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Expand aria-hidden="true" className="size-3" />
        Select the image to preview it.
      </span>
    </div>
  );
}
