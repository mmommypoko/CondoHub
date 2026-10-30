import { describe, expect, it } from 'vitest';
import { validatePassword } from '@/modules/identity-access/domain/passwordPolicy';

describe('BUG-007 new password must differ from the temporary password', () => {
  it('rejects a new password equal to the temporary password', () => {
    expect(
      validatePassword({
        password: 'TempPassWord42',
        username: 'malee.room',
        tempPassword: 'TempPassWord42',
      }),
    ).toBe('PASSWORD_EQUALS_TEMP');
  });

  it('accepts a new password that differs from the temporary password', () => {
    expect(
      validatePassword({
        password: 'BrandNewPass42',
        username: 'malee.room',
        tempPassword: 'TempPassWord42',
      }),
    ).toBeNull();
  });

  it('ignores the temp check when no temporary password is supplied', () => {
    expect(
      validatePassword({ password: 'BrandNewPass42', username: 'malee.room' }),
    ).toBeNull();
  });

  it('keeps precedence below length and username checks', () => {
    expect(
      validatePassword({ password: 'short', username: 'malee.room', tempPassword: 'short' }),
    ).toBe('PASSWORD_TOO_SHORT');
    expect(
      validatePassword({
        password: 'malee.room.malee.room',
        username: 'malee.room.malee.room',
        tempPassword: 'malee.room.malee.room',
      }),
    ).toBe('PASSWORD_EQUALS_USERNAME');
  });
});
