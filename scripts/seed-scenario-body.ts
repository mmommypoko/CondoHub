import { randomUUID } from 'node:crypto';
import type { Actor } from '@/shared/auth/actor';
import {
  createIdentityCtx,
  provisionSeedUser,
} from '@/modules/identity-access/application/index';
import {
  addMembership,
  createBuilding,
  createFloor,
  createPropertyCtx,
  createRoom,
  createTenancy,
  endMembershipAt,
  endTenancyAt,
  grantCoOwner,
  seedOwnership,
  transferOwnership,
  wireRoomProvisioningPorts,
} from '@/modules/property-membership/application/index';

const LONG_TEXT =
  'Maple Residences Tower of Enduring Harmony and Perpetual Serenity by the Riverside Gardens Extension Block C Wing D Unit Corridor North';

interface SeedAccount {
  key: string;
  name: string;
  isSystemAdmin: boolean;
  mustChangePassword: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
}

const ACCOUNTS: SeedAccount[] = [
  { key: 'admin', name: 'Scenario Admin', isSystemAdmin: true, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'ownera', name: 'Amara Owner', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'ownerc', name: 'Chai Coowner', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'ownernewb', name: 'Bima Newowner', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'maint', name: 'Mali Main', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'subt', name: 'Somsak Sub', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'privt', name: 'Pim Private', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'formert', name: 'Fah Former', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'formerowner', name: 'Nok Formerowner', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'noaccess', name: 'Noa Noaccess', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'ACTIVE' },
  { key: 'suspended', name: 'Sak Suspended', isSystemAdmin: false, mustChangePassword: false, accountStatus: 'SUSPENDED' },
  { key: 'freshuser', name: 'Fai Fresh', isSystemAdmin: false, mustChangePassword: true, accountStatus: 'ACTIVE' },
];

function seedActor(userId: string, isSystemAdmin: boolean): Actor {
  return { userId, isSystemAdmin, accountStatus: 'ACTIVE', mustChangePassword: false };
}

function backdate(monthsAgo: number): Date {
  const at = new Date();
  at.setUTCMonth(at.getUTCMonth() - monthsAgo);
  return at;
}

export async function runPropertyScenario(runId: string): Promise<void> {
  wireRoomProvisioningPorts();
  const safeRun = runId.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const requestId = randomUUID();
  const identityCtx = createIdentityCtx({ requestId, isSeedActor: true });
  const propertyCtx = createPropertyCtx({ requestId, isSeedActor: true });
  const bootstrap = seedActor('seed-bootstrap', true);
  const userIds = new Map<string, string>();
  for (const [index, account] of ACCOUNTS.entries()) {
    const username = `e2e${safeRun}${account.key}`.slice(0, 30);
    const result = await provisionSeedUser(
      bootstrap,
      {
        username,
        email: `${username}@example.invalid`,
        name: account.key === 'ownera' ? LONG_TEXT : account.name,
        phone: `+6600000${String(1000 + index)}`,
        isSystemAdmin: account.isSystemAdmin,
        initialFlags: {
          mustChangePassword: account.mustChangePassword,
          accountStatus: account.accountStatus,
        },
      },
      identityCtx,
    );
    userIds.set(account.key, result.userId);
    console.log(`seed ${runId} ${account.key} tempPassword=${result.tempPassword}`);
  }
  const admin = seedActor(userIds.get('admin') ?? '', true);
  const ownerA = seedActor(userIds.get('ownera') ?? '', false);
  const ownerAId = userIds.get('ownera') ?? '';
  const ownerCId = userIds.get('ownerc') ?? '';
  const building = await createBuilding(
    admin,
    {
      projectId: randomUUID(),
      code: `E2E-${runId}`.slice(0, 64),
      name: `E2E Building ${runId} ${LONG_TEXT}`.slice(0, 255),
      status: 'ACTIVE',
    },
    propertyCtx,
  );
  const floor = await createFloor(
    admin,
    { buildingId: building.id, code: `F1-${safeRun}`, label: `Floor 1 ${runId}` },
    propertyCtx,
  );
  const rooms = new Map<string, string>();
  for (const code of ['101', '102', '103', '104', '105']) {
    const room = await createRoom(
      admin,
      {
        floorId: floor.id,
        buildingId: building.id,
        roomCode: `E2E-${runId}-${code}`,
        areaSqm: code === '105' ? '120.50' : '35.50',
        status: 'ACTIVE',
      },
      propertyCtx,
    );
    rooms.set(code, room.id);
  }
  const room101 = rooms.get('101') ?? '';
  const room102 = rooms.get('102') ?? '';
  const room103 = rooms.get('103') ?? '';
  const room104 = rooms.get('104') ?? '';
  const room105 = rooms.get('105') ?? '';
  await seedOwnership(admin, { roomId: room101, userId: ownerAId, startAt: backdate(8) }, propertyCtx);
  await grantCoOwner(ownerA, { roomId: room101, userId: ownerCId }, propertyCtx);
  const tenancy101 = await createTenancy(
    ownerA,
    { roomId: room101, startsAt: backdate(6), endsAt: null, managementMode: 'PRIVATE_OWNER_MANAGED' },
    propertyCtx,
  );
  await addMembership(
    ownerA,
    { roomId: room101, userId: userIds.get('privt') ?? '', memberRole: 'MAIN', tenancyId: tenancy101.id },
    propertyCtx,
  );
  const tenancy102 = await createTenancy(
    admin,
    { roomId: room102, startsAt: backdate(6), endsAt: null, managementMode: 'PROJECT_MANAGED' },
    propertyCtx,
  );
  await addMembership(
    admin,
    { roomId: room102, userId: userIds.get('maint') ?? '', memberRole: 'MAIN', tenancyId: tenancy102.id },
    propertyCtx,
  );
  await addMembership(
    admin,
    { roomId: room102, userId: userIds.get('subt') ?? '', memberRole: 'SUB', tenancyId: tenancy102.id },
    propertyCtx,
  );
  const endedTenancy = await createTenancy(
    admin,
    { roomId: room104, startsAt: backdate(3), endsAt: null, managementMode: 'PRIVATE_OWNER_MANAGED' },
    propertyCtx,
  );
  const formerMember = await addMembership(
    admin,
    { roomId: room104, userId: userIds.get('formert') ?? '', memberRole: 'MAIN', tenancyId: endedTenancy.id },
    propertyCtx,
  );
  await endMembershipAt(admin, { roomId: room104, membershipId: formerMember.id }, propertyCtx);
  await endTenancyAt(admin, { tenancyId: endedTenancy.id }, propertyCtx);
  await createTenancy(
    admin,
    { roomId: room104, startsAt: new Date(), endsAt: null, managementMode: 'PRIVATE_OWNER_MANAGED' },
    propertyCtx,
  );
  await seedOwnership(
    admin,
    { roomId: room103, userId: userIds.get('formerowner') ?? '', startAt: backdate(10) },
    propertyCtx,
  );
  await transferOwnership(
    admin,
    {
      roomId: room103,
      fromUserId: userIds.get('formerowner') ?? '',
      toUserId: ownerAId,
      effectiveAt: backdate(2),
    },
    propertyCtx,
  );
  await seedOwnership(admin, { roomId: room105, userId: ownerAId, startAt: backdate(9) }, propertyCtx);
  await transferOwnership(
    admin,
    {
      roomId: room105,
      fromUserId: ownerAId,
      toUserId: userIds.get('ownernewb') ?? '',
      effectiveAt: backdate(1),
    },
    propertyCtx,
  );
  console.log(`Scenario seed complete for run ${runId}.`);
}
