import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { EmptyState } from '@/shared/ui/EmptyState';

export default async function FormerDebtPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/former-debt');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <main
      data-testid="former-debt-page"
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Former debt</h1>
        <p className="text-sm text-muted-foreground">
          Outstanding balances from rooms you no longer occupy.
        </p>
      </div>
      <EmptyState
        data-testid="former-debt-empty"
        title="No former debt"
        description="Billing lands in P3. This placeholder holds the route without room context."
      />
    </main>
  );
}
