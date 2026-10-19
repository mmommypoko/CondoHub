'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House } from 'lucide-react';
import { cx } from '@/shared/ui';
import { RESIDENT_MORE_LINKS, RESIDENT_NAV_LINKS, matchNavHref } from './shellNav';

export function ResidentSidebar() {
  const pathname = usePathname();
  const home = '/';
  return (
    <nav
      data-testid="resident-sidebar"
      aria-label="Resident navigation"
      className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 md:flex"
    >
      <Link
        data-testid="shell-brand"
        href={home}
        className="flex items-center gap-2 rounded-md px-2 py-1 text-heading font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <House aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
      <div className="flex flex-col gap-6">
        <ul className="flex flex-col gap-1">
          {RESIDENT_NAV_LINKS.map((link) => {
            const active = matchNavHref(pathname, link.href);
            return (
              <li key={link.testId} className="relative">
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary"
                  />
                ) : null}
                <Link
                  data-testid={link.testId}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center gap-3 rounded-md py-2 pl-4 pr-3 text-body font-medium transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
                    active
                      ? 'text-primary'
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
        <section aria-label="More" className="flex flex-col gap-1">
          <h2 className="px-4 text-caption font-medium text-muted-foreground">More</h2>
          <ul className="flex flex-col gap-1">
            {RESIDENT_MORE_LINKS.map((link) => {
              const active = matchNavHref(pathname, link.href);
              return (
                <li key={link.testId} className="relative">
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-primary"
                    />
                  ) : null}
                  <Link
                    data-testid={link.testId}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex items-center gap-3 rounded-md py-2 pl-4 pr-3 text-body font-medium transition-[color,background-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
                      active
                        ? 'text-primary'
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
      </div>
    </nav>
  );
}
