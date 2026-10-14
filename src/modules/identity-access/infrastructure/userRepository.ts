import 'server-only';
import { eq, sql } from 'drizzle-orm';
import type { Db, Tx } from '@/shared/db/transaction';
import type { AccountStatus } from '@/shared/auth/actor';
import { session, user } from './betterAuthSchema';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phone: string | null;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  isSystemAdmin: boolean;
  createdAt: Date;
}

function toUserRow(row: typeof user.$inferSelect): UserRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    phone: row.phone,
    accountStatus: row.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    mustChangePassword: row.mustChangePassword,
    isSystemAdmin: row.isSystemAdmin,
    createdAt: row.createdAt,
  };
}

export async function findUserById(db: Db, userId: string): Promise<UserRow | null> {
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toUserRow(row);
}

export async function findUserByUsername(db: Db, normalizedUsername: string): Promise<UserRow | null> {
  const rows = await db
    .select()
    .from(user)
    .where(eq(user.username, normalizedUsername))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : toUserRow(row);
}

export async function findUserByEmail(db: Db, normalizedEmail: string): Promise<UserRow | null> {
  const rows = await db.select().from(user).where(eq(user.email, normalizedEmail)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toUserRow(row);
}

export async function deleteUserSessions(tx: Tx, userId: string): Promise<number> {
  const deleted = await tx.delete(session).where(eq(session.userId, userId)).returning({ id: session.id });
  return deleted.length;
}

export async function countActiveSessions(db: Db, userId: string, now: Date): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(session)
    .where(eq(session.userId, userId));
  void now;
  const row = rows[0];
  return row === undefined ? 0 : row.count;
}

export interface UserSearchInput {
  query?: string | undefined;
  page: number;
  pageSize: number;
}

export interface UserSearchResult {
  rows: UserRow[];
  total: number;
}

export async function searchUsers(db: Db, input: UserSearchInput): Promise<UserSearchResult> {
  const pattern = input.query === undefined || input.query === '' ? null : `%${input.query}%`;
  const whereClause =
    pattern === null
      ? undefined
      : sql`(${user.username} ILIKE ${pattern} OR ${user.email} ILIKE ${pattern} OR ${user.name} ILIKE ${pattern})`;
  const offset = (input.page - 1) * input.pageSize;
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(user)
      .where(whereClause)
      .orderBy(user.createdAt)
      .limit(input.pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(whereClause),
  ]);
  const totalRow = totals[0];
  return { rows: rows.map(toUserRow), total: totalRow === undefined ? 0 : totalRow.count };
}
