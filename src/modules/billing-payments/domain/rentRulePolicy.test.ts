import { describe, expect, it } from 'vitest';
import { selectFeeRule, selectRentRule, canManageRent } from './rentRulePolicy';
const at = new Date('2026-11-01T00:00:00+07:00');
const rule = (id: string, roomId: string | null, date: string) => ({
  id,
  roomId,
  kind: 'PRIVATE_RENT',
  frequency: 'MONTHLY',
  effectiveAt: new Date(date),
  enabled: true,
});
describe('rent rule selection', () => {
  it('prefers the latest effective room rate over an older rate and global default', () => {
    const rows = [
      rule('old', 'room', '2026-01-01'),
      rule('global', null, '2026-10-01'),
      rule('new', 'room', '2026-10-01'),
      rule('future', 'room', '2026-12-01'),
    ];
    expect(selectRentRule(rows, 'room', 'PRIVATE_RENT', at)?.id).toBe('new');
  });
  it('ignores other rooms, disabled rules and other invoice kinds', () => {
    expect(
      selectRentRule(
        [
          rule('other', 'elsewhere', '2026-01-01'),
          { ...rule('off', 'room', '2026-01-01'), enabled: false },
          { ...rule('fee', 'room', '2026-01-01'), kind: 'COMMON_FEE' },
        ],
        'room',
        'PRIVATE_RENT',
        at,
      ),
    ).toBeNull();
    expect(
      selectRentRule([rule('global', null, '2026-01-01')], 'room', 'PRIVATE_RENT', at)?.id,
    ).toBe('global');
  });
  it('keeps project rent with admins and private rent with current non-admin owners', () => {
    expect(canManageRent(true, false, 'PROJECT_MANAGED')).toBe(true);
    expect(canManageRent(false, true, 'PROJECT_MANAGED')).toBe(false);
    expect(canManageRent(false, true, 'PRIVATE_OWNER_MANAGED')).toBe(true);
    expect(canManageRent(true, true, 'PRIVATE_OWNER_MANAGED')).toBe(false);
    expect(canManageRent(false, false, 'PRIVATE_OWNER_MANAGED')).toBe(false);
  });
});

describe('BUG-002 BUG-003 common fee rule selection per frequency', () => {
  const feeRule = (id: string, roomId: string | null, date: string, frequency = 'MONTHLY') => ({
    id,
    roomId,
    kind: 'COMMON_FEE',
    frequency,
    effectiveAt: new Date(date),
    enabled: true,
  });
  it('prefers the room rule over a newer global rule', () => {
    const rows = [
      feeRule('global-new', null, '2026-10-01'),
      feeRule('room-old', 'room', '2026-01-01'),
      feeRule('room-future', 'room', '2026-12-01'),
    ];
    expect(selectFeeRule(rows, 'room', 'COMMON_FEE', 'MONTHLY', at)?.id).toBe('room-old');
  });
  it('prefers the newest effective rule among room rules', () => {
    const rows = [
      feeRule('room-old', 'room', '2026-01-01'),
      feeRule('room-new', 'room', '2026-10-01'),
    ];
    expect(selectFeeRule(rows, 'room', 'COMMON_FEE', 'MONTHLY', at)?.id).toBe('room-new');
  });
  it('isolates frequencies and rooms', () => {
    const rows = [
      feeRule('yearly', 'room', '2026-01-01', 'YEARLY'),
      feeRule('other-room', 'elsewhere', '2026-01-01'),
      feeRule('one-time', null, '2026-01-01', 'ONE_TIME'),
    ];
    expect(selectFeeRule(rows, 'room', 'COMMON_FEE', 'MONTHLY', at)).toBeNull();
    expect(selectFeeRule(rows, 'room', 'COMMON_FEE', 'ONE_TIME', at)?.id).toBe('one-time');
  });
});
