import {
  Archive,
  Building2,
  CalendarDays,
  FileText,
  Home,
  KeyRound,
  Megaphone,
  ReceiptText,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface ShellNavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  testId: string;
}

export const RESIDENT_NAV_LINKS: ShellNavLink[] = [
  { href: '/rooms', label: 'Rooms', icon: Home, testId: 'nav-my-rooms' },
  { href: '/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-facilities' },
  { href: '/maintenance', label: 'Requests', icon: Wrench, testId: 'nav-maintenance' },
  { href: '/invoices', label: 'Bills', icon: ReceiptText, testId: 'nav-invoices' },
];

export const RESIDENT_MORE_LINKS: ShellNavLink[] = [
  { href: '/announcements', label: 'Announcements', icon: Megaphone, testId: 'nav-more-announcements' },
  { href: '/former-debt', label: 'Former debt', icon: FileText, testId: 'nav-more-former-debt' },
  { href: '/historical-fees', label: 'Historical fees', icon: Archive, testId: 'nav-more-historical-fees' },
];

export const ADMIN_WORKSPACE_LINKS: ShellNavLink[] = [
  { href: '/rooms', label: 'My Rooms', icon: Home, testId: 'nav-my-rooms' },
  { href: '/facilities', label: 'Facilities', icon: CalendarDays, testId: 'nav-facilities' },
  { href: '/maintenance', label: 'My Requests', icon: Wrench, testId: 'nav-maintenance' },
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
  return pathname === href || pathname.startsWith(`${href}/`);
}
