'use client';

import { useRouter } from 'next/navigation';
import {
  TurnoverResolveForm,
  type TurnoverResolveReview,
} from '@/modules/billing-payments/ui/TurnoverResolveForm';

export function TurnoverResolveSection({
  review,
  actorIsAdmin,
}: {
  review: TurnoverResolveReview;
  actorIsAdmin: boolean;
}) {
  const router = useRouter();
  return (
    <section aria-label="Resolve review" className="flex min-w-0 flex-col gap-4">
      <h2 className="text-heading font-semibold tracking-tight text-foreground">Resolve this review</h2>
      <TurnoverResolveForm
        review={review}
        actorIsAdmin={actorIsAdmin}
        onResolved={() => router.refresh()}
      />
    </section>
  );
}
