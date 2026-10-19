'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Menu } from 'lucide-react';
import { Sheet, cx } from '@/shared/ui';
import { ADMIN_LINKS, ADMIN_WORKSPACE_LINKS, matchNavHref } from './shellNav';
import { UserMenu } from './UserMenu';

function AdminNavSections({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = [
    { title: 'Workspace', links: ADMIN_WORKSPACE_LINKS },
    { title: 'Administration', links: ADMIN_LINKS },
  ];
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <section key={section.title} aria-label={section.title} className="flex flex-col gap-1">
          <h2 className="px-3 text-xs font-semibold tracking-wide text-muted-foreground">
            {section.title}
          </h2>
          <ul className="flex flex-col gap-1">
            {section.links.map((link) => {
              const active = matchNavHref(pathname, link.href);
              return (
                <li key={link.testId}>
                  <Link
                    data-testid={link.testId}
                    href={link.href}
                    {...(onNavigate === undefined ? {} : { onClick: onNavigate })}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
                      active
                        ? 'bg-secondary text-foreground'
                        : 'text-body-secondary hover:bg-ghost-hover hover:text-foreground',
                    )}
                  >
                    <link.icon aria-hidden="true" className="size-4 shrink-0" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function AdminTopBar({ username }: { username: string }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <button
        data-testid="admin-nav-open"
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Open admin navigation"
        className="inline-flex shrink-0 items-center rounded-lg p-2 text-body-secondary transition-[background-color,color] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <Link
        data-testid="shell-brand-mobile"
        href="/admin/buildings"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg py-1 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:hidden"
      >
        <Home aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <div className="hidden min-w-0 flex-1 items-center md:flex" data-testid="topbar-context">
        <span className="truncate text-sm text-muted-foreground">Administration console</span>
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
