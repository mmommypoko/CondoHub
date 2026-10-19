import {
  Building2,
  CalendarDays,
  House,
  Megaphone,
  ReceiptText,
  Users,
  Wrench,
  Zap,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';

export interface ShellNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}

export const RESIDENT_NAV_LINKS: ShellNavLink[] = [
  { href: '/', label: 'Home', icon: House, testId: 'nav-home' },
  { href: '/rooms', label: 'Rooms', icon: Building2, testId: 'nav-my-rooms' },
  { href: '/invoices', label: 'Bills', icon: ReceiptText, testId: 'nav-invoices' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, testId: 'nav-maintenance' },
];

export const RESIDENT_MORE_LINKS: ShellNavLink[] = [
  { href: '/announcements', label: 'Announcements', icon: Megaphone, testId: 'nav-more-announcements' },
];

export const ADMIN_WORKSPACE_LINKS: ShellNavLink[] = [
  { href: '/rooms', label: 'Rooms', icon: House, testId: 'nav-my-rooms' },
  { href: '/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-facilities' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, testId: 'nav-maintenance' },
];

export const ADMIN_LINKS: ShellNavLink[] = [
  { href: '/admin/buildings', label: 'Buildings', icon: Building2, testId: 'nav-buildings' },
  { href: '/admin/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-admin-facilities' },
  { href: '/admin/ownership', label: 'Ownership', icon: KeyRound, testId: 'nav-ownership' },
  { href: '/admin/users', label: 'Users', icon: Users, testId: 'nav-users' },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, testId: 'nav-announcements' },
  { href: '/admin/billing/events', label: 'Billing Events', icon: Zap, testId: 'nav-billing-events' },
  {
    href: '/admin/billing/turnover-reviews',
    label: 'Turnover Reviews',
    icon: ReceiptText,
    testId: 'nav-billing-turnover-reviews',
  },
  { href: '/admin/billing/job-runs', label: 'Job Runs', icon: CalendarDays, testId: 'nav-billing-job-runs' },
  { href: '/admin/billing/invoices', label: 'Invoices', icon: ReceiptText, testId: 'nav-billing-invoices' },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, testId: 'nav-maintenance-inbox' },
];

export function matchNavHref(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
