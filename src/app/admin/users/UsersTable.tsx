'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useToast } from '@/shared/ui/Toast';

export interface AdminUserRow {
  id: string;
  username: string | null;
  email: string;
  name: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  mustChangePassword: boolean;
}

interface UsersTableProps {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}

async function postJson(path: string, body?: unknown): Promise<{ ok: boolean; payload: unknown }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload: unknown = await response.json().catch(() => null);
  return { ok: response.ok, payload };
}

function tempPasswordOf(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const data = (payload as Record<string, unknown>).data;
  if (typeof data !== 'object' || data === null) return null;
  const temp = (data as Record<string, unknown>).tempPassword;
  return typeof temp === 'string' ? temp : null;
}

export function UsersTable({ users, total, page, pageSize, query }: UsersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState(query);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [oncePassword, setOncePassword] = useState<{ userId: string; password: string } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function resetUser(id: string): Promise<void> {
    setBusyId(id);
    try {
      const { ok, payload } = await postJson(`/api/admin/users/${id}/reset-password`);
      if (!ok) {
        toast.error('Reset failed.');
        return;
      }
      const temp = tempPasswordOf(payload);
      if (temp !== null) setOncePassword({ userId: id, password: temp });
      toast.success('Password reset. Temporary password shown once.');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(id: string, accountStatus: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accountStatus }),
      });
      if (!response.ok) {
        toast.error('Status change failed.');
        return;
      }
      toast.success(accountStatus === 'SUSPENDED' ? 'Account suspended.' : 'Account reactivated.');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        data-testid="admin-users-search"
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const params = new URLSearchParams();
          if (search !== '') params.set('query', search);
          router.push(`/admin/users?${params.toString()}`);
        }}
      >
        <input
          data-testid="admin-users-search-input"
          type="search"
          aria-label="Search users"
          placeholder="Search by username, email, or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        />
        <Button type="submit">Search</Button>
      </form>
      {oncePassword !== null ? (
        <div
          data-testid="admin-users-temp-password"
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-subtle p-4"
        >
          <p className="text-sm font-medium text-foreground">
            Temporary password — shown once. Copy it now; it cannot be shown again.
          </p>
          <p className="font-mono text-sm text-foreground">{oncePassword.password}</p>
          <Button variant="secondary" size="sm" onClick={() => setOncePassword(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {users.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search." />
      ) : (
        <div data-testid="admin-users-table" className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="px-4 py-2 font-medium text-foreground">Username</th>
                <th className="px-4 py-2 font-medium text-foreground">Name</th>
                <th className="px-4 py-2 font-medium text-foreground">Email</th>
                <th className="px-4 py-2 font-medium text-foreground">Status</th>
                <th className="px-4 py-2 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 text-foreground">{row.username ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{row.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant={row.accountStatus === 'ACTIVE' ? 'success' : 'danger'}>
                      {row.accountStatus === 'ACTIVE' ? 'Active' : 'Suspended'}
                    </Badge>
                    {row.mustChangePassword ? <Badge variant="warning">Must change password</Badge> : null}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busyId === row.id}
                        onClick={() => void resetUser(row.id)}
                      >
                        Reset password
                      </Button>
                      {row.accountStatus === 'ACTIVE' ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => void setStatus(row.id, 'SUSPENDED')}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => void setStatus(row.id, 'ACTIVE')}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({total} users)
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams();
              if (query !== '') params.set('query', query);
              params.set('page', String(page - 1));
              router.push(`/admin/users?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams();
              if (query !== '') params.set('query', query);
              params.set('page', String(page + 1));
              router.push(`/admin/users?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
