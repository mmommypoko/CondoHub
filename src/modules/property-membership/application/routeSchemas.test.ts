import { describe, expect, it } from 'vitest';
import {
  buildingBody,
  buildingPatchBody,
  floorBody,
  memberAddBody,
  roomBody,
  roomPatchBody,
} from './routeSchemas';

const id = '00000000-0000-4000-8000-000000000001';

describe('named property creation', () => {
  it('allows renaming a building without changing its status', () => {
    expect(buildingPatchBody.safeParse({ name: 'Garden tower' }).success).toBe(true);
  });
  it('accepts a building name without requiring an internal code', () => {
    expect(buildingBody.safeParse({ projectId: id, name: 'River house' }).success).toBe(true);
  });

  it('accepts a floor label without requiring an internal code', () => {
    expect(floorBody.safeParse({ buildingId: id, label: 'Ground floor' }).success).toBe(true);
  });

  it('accepts a room name independently of its internal code', () => {
    const result = roomBody.safeParse({
      buildingId: id,
      floorId: id,
      name: '101',
      areaSqm: '42.5',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('101');
  });

  it('rejects unnamed rooms', () => {
    expect(
      roomBody.safeParse({ buildingId: id, floorId: id, name: '  ', areaSqm: '42.5' }).success,
    ).toBe(false);
  });

  it('keeps existing integrations that supply room codes working', () => {
    expect(
      roomBody.safeParse({ buildingId: id, floorId: id, roomCode: '101', areaSqm: '42.5' }).success,
    ).toBe(true);
  });

  it('allows changing the room name without changing the internal code', () => {
    expect(roomPatchBody.parse({ name: 'Garden suite' })).toEqual({ name: 'Garden suite' });
  });
});

describe('BUG-013 member add rejects account creation fields', () => {
  it('accepts username plus role without email, name, or phone', () => {
    const result = memberAddBody.safeParse({ username: 'malee.room', memberRole: 'SUB' });
    expect(result.success).toBe(true);
  });

  it('rejects email with a message that points at account creation', () => {
    const result = memberAddBody.safeParse({
      username: 'malee.room',
      email: 'malee@example.com',
      memberRole: 'SUB',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => [...issue.path, issue.message])).toContainEqual([
      'email',
      'Create the account first, then add the member by userId or username.',
    ]);
  });

  it('rejects name and phone with the same account creation message', () => {
    const result = memberAddBody.safeParse({
      userId: id,
      name: 'Malee Room',
      phone: '+66810000000',
      memberRole: 'MAIN',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => [...issue.path, issue.message])).toContainEqual([
      'name',
      'Create the account first, then add the member by userId or username.',
    ]);
    expect(result.error.issues.map((issue) => [...issue.path, issue.message])).toContainEqual([
      'phone',
      'Create the account first, then add the member by userId or username.',
    ]);
  });
});
