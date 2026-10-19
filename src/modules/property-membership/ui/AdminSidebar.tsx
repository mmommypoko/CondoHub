'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';
import { cx } from '@/shared/ui';
import { ADMIN_LINKS, ADMIN_WORKSPACE_LINKS, matchNavHref } from './shellNav';

export function AdminSidebar() {
  const pathname = usePathname();
  const sections = [
    { title: 'Workspace', links: ADMIN_WORKSPACE_LINKS },
    { title: 'Administration', links: ADMIN_LINKS },
  ];
  return (
    <nav
      data-testid="admin-sidebar"
      aria-label="Admin navigation"
      className="hidden w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface px-4 py-6 md:flex"
    >
      <Link
        data-testid="shell-brand"
        href="/admin/buildings"
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <Home aria-hidden="true" className="size-5 text-primary" />
        CondoHub
      </Link>
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
    </nav>
  );
}
