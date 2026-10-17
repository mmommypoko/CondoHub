import 'server-only';

export { createPropertyCtx } from './ctx';
export type { PropertyCtx } from './ctx';
export {
  canActInRoom,
  getActiveResidentRooms,
  getCurrentOwners,
  getEligibleMaintenanceRooms,
  getMembershipIntervals,
  getOwnersAt,
  getRentalPeriods,
  getResidentIntervals,
  getRoomDetail,
  isOwnerAt,
  listMembershipWindowsByUser,
  membershipOverlapsServiceWindow,
  resolveActorRooms,
  roomResidencyScope,
  tenantOverlapScope,
} from './queries';
export type {
  MaintenanceRouting,
  MembershipInterval,
  MembershipWindowRef,
  OwnerRef,
  PmAction,
  RentalPeriodDto,
  ResidentInterval,
  RoomActVerdict,
  RoomDetail,
} from './queries';
export {
  createBuilding,
  createFloor,
  createRoom,
  disableBuilding,
  disableRoom,
  listAllBuildings,
  listBuildingStructures,
  previewRoomImpact,
  updateRoomDetails,
} from './structures';
export type { RoomImpactPreview } from './structures';
export { grantCoOwner, resolveGrantTargetByUsername } from './grantCoOwner';
export type { GrantCoOwnerInput, GrantCoOwnerResult } from './grantCoOwner';
export { seedOwnership } from './seedOwnership';
export {
  correctOwnershipInterval,
  removeOwnership,
  transferOwnership,
} from './ownershipAdmin';
export type { TransferOwnershipInput, TransferOwnershipResult } from './ownershipAdmin';
export {
  createTenancy,
  endTenancyAt,
  listRoomActiveTenancies,
  listRoomTenancies,
} from './tenancies';
export type { CreateTenancyInput } from './tenancies';
export {
  addMembership,
  attachProvisionedMembership,
  endMembershipAt,
  listRoomMemberships,
} from './memberships';
export type { AddMembershipInput } from './memberships';
export {
  attachRoomMembership,
  resolveRoomEntitlement,
  wireRoomProvisioningPorts,
} from './provisioningPorts';
export { parseWithFieldErrors } from './routeSchemas';
export type {
  BuildingBody,
  CoOwnerGrantBody,
  FloorBody,
  MemberAddBody,
  MemberPatchBody,
  OwnershipAdminBody,
  RoomBody,
  RoomListQuery,
  RoomPatchBody,
  TenancyBody,
} from './routeSchemas';
