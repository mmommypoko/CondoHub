import 'server-only';
import type { Db } from '@/shared/db/transaction';
import type { AccountStatus } from '@/shared/auth/actor';
import {
  findUserById,
  findUserByUsername,
} from '../infrastructure/userRepository';

export interface UserLookupResult {
  id: string;
  accountStatus: AccountStatus;
  deletedAt: Date | null;
}

export async function lookupUserById(conn: Db, userId: string): Promise<UserLookupResult | null> {
  const found = await findUserById(conn, userId);
  if (found === null) return null;
  return { id: found.id, accountStatus: found.accountStatus, deletedAt: found.deletedAt };
}

export async function lookupUserIdByUsername(
  conn: Db,
  normalizedUsername: string,
): Promise<{ userId: string } | null> {
  const found = await findUserByUsername(conn, normalizedUsername);
  return found === null ? null : { userId: found.id };
}
