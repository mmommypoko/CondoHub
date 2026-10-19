import 'server-only';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui';
import { getSenderProfile } from '@/modules/identity-access/application/index';
import { AdminSidebar } from '@/modules/property-membership/ui/AdminSidebar';
import { AdminTopBar } from '@/modules/property-membership/ui/AdminShell';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/buildings');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  let username = 'Account';
  try {
    const profile = await getSenderProfile(actor.userId);
    username = profile.name;
  } catch {
    username = 'Account';
  }
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar username={username} />
        <div className="border-b border-border bg-surface px-4 py-2 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <Badge data-testid="role-label" variant="neutral">
              System Admin
            </Badge>
          </div>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
