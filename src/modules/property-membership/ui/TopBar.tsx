'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { House } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function TopBar({
  roleLabel,
  username,
  context,
  brandHref,
}: {
  roleLabel: string;
  username: string;
  context?: ReactNode;
  brandHref: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <Link
        data-testid="shell-brand-mobile"
        href={brandHref}
        aria-label="CondoHub home"
        className="inline-flex shrink-0 items-center gap-2 rounded-md py-1 text-heading font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:hidden"
      >
        <House aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <div className="hidden min-w-0 flex-1 items-center md:flex" data-testid="topbar-context">
        {context ?? <span className="truncate text-small text-muted-foreground">CondoHub</span>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <UserMenu roleLabel={roleLabel} username={username} />
      </div>
    </header>
  );
}
