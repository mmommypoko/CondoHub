import { describe, expect, it } from 'vitest';
import {
  isRevocationEvent,
  requiresFullLogout,
} from '@/modules/identity-access/domain/sessionPolicy';

describe('BUG-039 account deletion is a distinct revocation event', () => {
  it('treats delete as a revoke-all event', () => {
    expect(isRevocationEvent('DELETE')).toBe(true);
    expect(requiresFullLogout('DELETE')).toBe(true);
  });

  it('keeps suspend as a separate revoke-all event', () => {
    expect(isRevocationEvent('SUSPEND')).toBe(true);
    expect(requiresFullLogout('SUSPEND')).toBe(true);
  });
});
