import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui/EmptyState';

export default async function HistoricalFeesPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/historical-fees');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <main
      data-testid="historical-fees-page"
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Historical fees</h1>
        <p className="text-sm text-muted-foreground">
          Past common-fee invoices tied to your ownership history.
        </p>
      </div>
      <EmptyState
        data-testid="historical-fees-empty"
        title="No historical fees"
        description="Billing lands in P3. This placeholder holds the route without room context."
      />
    </main>
  );
}
