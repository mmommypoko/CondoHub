'use client';

import { useState } from 'react';
import Link from 'next/link';
import { House, Menu } from 'lucide-react';
import { Sheet } from '@/shared/ui';
import { AdminNavSections } from './AdminSidebar';
import { UserMenu } from './UserMenu';

export function AdminTopBar({ username }: { username: string }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <button
        data-testid="admin-nav-open"
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Open admin navigation"
        className="inline-flex shrink-0 items-center rounded-md p-2 text-body-secondary transition-[background-color,color] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <Link
        data-testid="shell-brand-mobile"
        href="/admin/buildings"
        className="inline-flex shrink-0 items-center gap-2 rounded-md py-1 text-heading font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:hidden"
      >
        <House aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <div className="hidden min-w-0 flex-1 items-center md:flex" data-testid="topbar-context">
        <span className="truncate text-small text-muted-foreground">Administration console</span>
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        <UserMenu roleLabel="System Admin" username={username} />
      </div>
      <Sheet open={navOpen} onClose={() => setNavOpen(false)} title="Administration" testId="admin-nav-sheet">
        <nav aria-label="Admin navigation">
          <AdminNavSections onNavigate={() => setNavOpen(false)} />
        </nav>
      </Sheet>
    </header>
  );
}
