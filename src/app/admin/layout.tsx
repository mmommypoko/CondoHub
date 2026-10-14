import 'server-only';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { Badge } from '@/shared/ui/Badge';
import { AdminSidebar } from '@/modules/property-membership/ui/AdminSidebar';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/buildings');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <span className="text-base font-semibold text-foreground">CondoHub</span>
        <Badge data-testid="role-label" variant="neutral">
          System Admin
        </Badge>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
