'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Menu } from 'lucide-react';
import { Sheet, cx } from '@/shared/ui';
import { UserMenu } from './UserMenu';
import { RESIDENT_MORE_LINKS, matchNavHref } from './shellNav';

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
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreLinks = RESIDENT_MORE_LINKS;
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 sm:px-6">
      <Link
        data-testid="shell-brand-mobile"
        href={brandHref}
        aria-label="CondoHub home"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg py-1 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring md:hidden"
      >
        <Home aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <div className="hidden min-w-0 flex-1 items-center md:flex" data-testid="topbar-context">
        {context ?? <span className="truncate text-sm text-muted-foreground">CondoHub</span>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {moreLinks.length > 0 ? (
          <>
            <button
              data-testid="shell-more-open"
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg p-2 text-body-secondary transition-[background-color,color] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none md:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <Sheet
              open={moreOpen}
              onClose={() => setMoreOpen(false)}
              title="More"
              testId="shell-more-sheet"
            >
              <ul className="flex flex-col gap-1">
                {moreLinks.map((link) => {
                  const active = matchNavHref(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        data-testid={link.testId}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cx(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
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
            </Sheet>
          </>
        ) : null}
        <UserMenu roleLabel={roleLabel} username={username} />
      </div>
    </header>
  );
}
