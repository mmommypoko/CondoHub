'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleUserRound, Loader2, LogOut } from 'lucide-react';
import { cx, useToast } from '@/shared/ui';
import { authClient } from '@/modules/identity-access/ui/authClient';

export function UserMenu({ roleLabel, username }: { roleLabel: string; username: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error !== null) {
        toast.error('Sign out failed', { description: 'Retry in a moment.' });
        setSigningOut(false);
        return;
      }
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Sign out failed', { description: 'Retry in a moment.' });
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <CircleUserRound aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      <div className="hidden min-w-0 max-w-36 flex-col overflow-hidden leading-tight sm:flex md:max-w-48">
        <span data-testid="user-menu-username" className="truncate text-sm font-medium text-foreground">
          {username}
        </span>
        <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
      </div>
      <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden="true" />
      <Link
        data-testid="user-menu-change-password"
        href="/change-password"
        className="hidden shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-body-secondary transition-[background-color,color] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none md:inline-flex"
      >
        Password
      </Link>
      <button
        data-testid="user-menu-sign-out"
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-busy={signingOut || undefined}
        className={cx(
          'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-body-secondary transition-[background-color,color,opacity] duration-150 ease-out hover:bg-ghost-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none',
          signingOut && 'cursor-wait opacity-70',
        )}
      >
        {signingOut ? (
          <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-4" />
        )}
        <span className="hidden sm:inline">{signingOut ? 'Signing out' : 'Sign out'}</span>
        <span className="sr-only sm:hidden">{signingOut ? 'Signing out' : 'Sign out'}</span>
      </button>
    </div>
  );
}
