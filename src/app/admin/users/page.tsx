import 'server-only';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { db } from '@/shared/db/client';
import { searchUsers } from '@/modules/identity-access/infrastructure/userRepository';
import { UsersTable } from './UsersTable';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/users');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const result = await searchUsers(db, { query: params.query, page, pageSize: 20 });
  return (
    <main data-testid="admin-users-page" className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search accounts, provision new users, reset passwords, and suspend accounts.
        </p>
      </div>
      <UsersTable
        users={result.rows.map((row) => ({
          id: row.id,
          username: row.username,
          email: row.email,
          name: row.name,
          accountStatus: row.accountStatus,
          mustChangePassword: row.mustChangePassword,
        }))}
        total={result.total}
        page={page}
        pageSize={20}
        query={params.query ?? ''}
      />
    </main>
  );
}
