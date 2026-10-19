import 'server-only';
import { redirect } from 'next/navigation';
import { EmptyState, PageHeader } from '@/shared/ui';
import { getActorFromSession } from '@/shared/auth/actor';

export default async function FormerDebtPage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/former-debt');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <main
      data-testid="former-debt-page"
      className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6"
    >
      <PageHeader
        title="Former debt"
        description="Outstanding balances from rooms you no longer occupy."
      />
      <EmptyState
        data-testid="former-debt-empty"
        title="No former debt"
        description="Billing lands in P3. This placeholder holds the route without room context."
      />
    </main>
  );
}
