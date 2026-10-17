'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarDays, Home, KeyRound, Megaphone, ReceiptText, Users, Wrench, Zap } from 'lucide-react';
import { cx } from '@/shared/ui/cx';

const WORKSPACE_LINKS = [
  { href: '/rooms', label: 'My Rooms', icon: Home, testId: 'nav-my-rooms' },
  { href: '/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-facilities' },
  { href: '/maintenance', label: 'My Requests', icon: Wrench, testId: 'nav-maintenance' },
];

const ADMIN_LINKS = [
  { href: '/admin/buildings', label: 'Buildings', icon: Building2, testId: 'nav-buildings' },
  { href: '/admin/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-admin-facilities' },
  { href: '/admin/ownership', label: 'Ownership', icon: KeyRound, testId: 'nav-ownership' },
  { href: '/admin/users', label: 'Users', icon: Users, testId: 'nav-users' },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, testId: 'nav-announcements' },
  { href: '/admin/billing/events', label: 'Billing Events', icon: Zap, testId: 'nav-billing-events' },
  { href: '/admin/billing/turnover-reviews', label: 'Turnover Reviews', icon: ReceiptText, testId: 'nav-billing-turnover-reviews' },
  { href: '/admin/billing/job-runs', label: 'Job Runs', icon: CalendarDays, testId: 'nav-billing-job-runs' },
  { href: '/admin/billing/invoices', label: 'Invoices', icon: ReceiptText, testId: 'nav-billing-invoices' },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, testId: 'nav-maintenance-inbox' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <nav
      data-testid="admin-sidebar"
      aria-label="Workspace navigation"
      className="flex w-full flex-col gap-6 border-b border-border bg-surface p-4 md:w-60 md:shrink-0 md:border-b-0 md:border-r"
    >
      <div className="flex flex-col gap-1">
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspace
        </h2>
        {WORKSPACE_LINKS.map((link) => (
          <Link
            key={link.href}
            data-testid={link.testId}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={cx(
              'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium',
              pathname === link.href
                ? 'bg-neutral text-foreground'
                : 'text-secondary-foreground hover:bg-ghost-hover hover:text-foreground',
            )}
          >
            <link.icon aria-hidden="true" className="size-4 shrink-0" />
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Administration
        </h2>
        {ADMIN_LINKS.map((link) => (
          <Link
            key={link.href}
            data-testid={link.testId}
            href={link.href}
            aria-current={pathname === link.href ? 'page' : undefined}
            className={cx(
              'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium',
              pathname === link.href
                ? 'bg-neutral text-foreground'
                : 'text-secondary-foreground hover:bg-ghost-hover hover:text-foreground',
            )}
          >
            <link.icon aria-hidden="true" className="size-4 shrink-0" />
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
