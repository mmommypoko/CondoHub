import { describe, expect, it, vi } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { SQL } from 'drizzle-orm';
import { user } from './betterAuthSchema';

vi.mock('server-only', () => ({}));

function whereMentions(where: SQL | undefined, column: string): boolean {
  if (where === undefined) return false;
  return where.queryChunks.some((chunk: unknown) => {
    if (typeof chunk !== 'object' || chunk === null) return String(chunk).includes(column);
    return 'name' in chunk && (chunk as { name: unknown }).name === column;
  });
}

describe('BUG-005 live rows keep unique email and username, deleted rows do not block reuse', () => {
  it('declares partial unique indexes scoped to non-deleted rows', () => {
    const config = getTableConfig(user);
    const uniques = config.uniqueConstraints;
    expect(uniques).toHaveLength(0);

    const indexes = config.indexes;
    const emailIndex = indexes.find((entry) => entry.config.name === 'user_email_live_uq');
    const usernameIndex = indexes.find((entry) => entry.config.name === 'user_username_live_uq');
    expect(emailIndex?.config.unique).toBe(true);
    expect(usernameIndex?.config.unique).toBe(true);
    expect(whereMentions(emailIndex?.config.where as SQL | undefined, 'deleted_at')).toBe(true);
    expect(whereMentions(usernameIndex?.config.where as SQL | undefined, 'deleted_at')).toBe(
      true,
    );
  });

  it('keeps email required and username optional at the column level', () => {
    const config = getTableConfig(user);
    const columns = Object.fromEntries(
      config.columns.map((column) => [column.name, column]),
    );
    expect(columns['email']?.notNull).toBe(true);
    expect(columns['username']?.notNull).toBe(false);
  });
});
