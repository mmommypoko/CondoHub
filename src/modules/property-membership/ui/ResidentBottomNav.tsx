'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ellipsis } from 'lucide-react';
import { cx } from '@/shared/ui';
import { RESIDENT_MORE_LINKS, RESIDENT_NAV_LINKS, matchNavHref } from './shellNav';

export function ResidentBottomNav() {
  const pathname = usePathname();
  const moreLink = RESIDENT_MORE_LINKS[0];
  const moreActive =
    moreLink !== undefined && matchNavHref(pathname, moreLink.href);
  return (
    <nav
      data-testid="resident-bottom-nav"
      aria-label="Resident navigation"
      className="sticky bottom-0 z-30 border-t border-border bg-surface shadow-[var(--ui-shadow-raised)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {RESIDENT_NAV_LINKS.map((link) => {
          const active = matchNavHref(pathname, link.href);
          return (
            <li key={link.testId} className="min-w-0">
              <Link
                data-testid={`${link.testId}-tab`}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-caption font-medium transition-[color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <link.icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            </li>
          );
        })}
        {moreLink !== undefined ? (
          <li className="min-w-0">
            <Link
              data-testid="nav-more-tab"
              href={moreLink.href}
              aria-current={moreActive ? 'page' : undefined}
              className={cx(
                'flex flex-col items-center gap-1 px-1 py-2.5 text-caption font-medium transition-[color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring motion-reduce:transition-none',
                moreActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Ellipsis aria-hidden="true" className="size-5 shrink-0" />
              <span className="truncate">More</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
