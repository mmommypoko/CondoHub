'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { cx } from '@/shared/ui';
import { RESIDENT_NAV_LINKS, matchNavHref } from './shellNav';

export function ResidentSidebar() {
  const pathname = usePathname();
  const items = RESIDENT_NAV_LINKS;
  const home = '/rooms';
  return (
    <nav
      data-testid="resident-sidebar"
      aria-label="Resident navigation"
      className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 md:flex"
    >
      <Link
        data-testid="shell-brand"
        href={home}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <Home aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <ul className="flex flex-col gap-1">
        {items.map((link) => {
          const active = matchNavHref(pathname, link.href);
          return (
            <li key={link.href}>
              <Link
                data-testid={link.testId}
                href={link.href}
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
    </nav>
  );
}
