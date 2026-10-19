import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { Db, Tx } from '@/shared/db/transaction';
import { building, floor, room } from './schema';

export interface BuildingRow {
  id: string;
  projectId: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FloorRow {
  id: string;
  buildingId: string;
  code: string;
  label: string;
}

export interface RoomRow {
  id: string;
  floorId: string;
  buildingId: string;
  roomCode: string;
  areaSqm: string;
  status: 'ACTIVE' | 'INACTIVE';
}

function toBuildingRow(row: typeof building.$inferSelect): BuildingRow {
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    name: row.name,
    status: row.status,
  };
}

function toFloorRow(row: typeof floor.$inferSelect): FloorRow {
  return { id: row.id, buildingId: row.buildingId, code: row.code, label: row.label };
}

function toRoomRow(row: typeof room.$inferSelect): RoomRow {
  return {
    id: row.id,
    floorId: row.floorId,
    buildingId: row.buildingId,
    roomCode: row.roomCode,
    areaSqm: row.areaSqm,
    status: row.status,
  };
}

export async function findBuildingById(db: Db, id: string): Promise<BuildingRow | null> {
  const rows = await db.select().from(building).where(eq(building.id, id)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toBuildingRow(row);
}

export async function listBuildings(db: Db): Promise<BuildingRow[]> {
  const rows = await db.select().from(building).orderBy(building.code);
  return rows.map(toBuildingRow);
}

export async function insertBuilding(
  tx: Tx,
  input: { projectId: string; code: string; name: string; status: 'ACTIVE' | 'INACTIVE' },
): Promise<BuildingRow> {
  const rows = await tx.insert(building).values(input).returning();
  const row = rows[0];
  if (row === undefined) throw new Error('Building insert returned no row.');
  return toBuildingRow(row);
}

export async function updateBuildingStatus(
  tx: Tx,
  id: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<BuildingRow | null> {
  const rows = await tx
    .update(building)
    .set({ status, updatedAt: new Date() })
    .where(eq(building.id, id))
    .returning();
  const row = rows[0];
  return row === undefined ? null : toBuildingRow(row);
}

export async function findFloorById(db: Db, id: string): Promise<FloorRow | null> {
  const rows = await db.select().from(floor).where(eq(floor.id, id)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toFloorRow(row);
}

export async function listFloorsByBuilding(db: Db, buildingId: string): Promise<FloorRow[]> {
  const rows = await db
    .select()
    .from(floor)
    .where(eq(floor.buildingId, buildingId))
    .orderBy(floor.code);
  return rows.map(toFloorRow);
}

export async function insertFloor(
  tx: Tx,
  input: { buildingId: string; code: string; label: string },
): Promise<FloorRow> {
  const rows = await tx.insert(floor).values(input).returning();
  const row = rows[0];
  if (row === undefined) throw new Error('Floor insert returned no row.');
  return toFloorRow(row);
}

export async function updateFloor(
  tx: Tx,
  id: string,
  input: { code?: string | undefined; label?: string | undefined },
): Promise<FloorRow | null> {
  const rows = await tx
    .update(floor)
    .set({ ...(input.code !== undefined ? { code: input.code } : {}), ...(input.label !== undefined ? { label: input.label } : {}) })
    .where(eq(floor.id, id))
    .returning();
  const row = rows[0];
  return row === undefined ? null : toFloorRow(row);
}

export async function deleteFloor(tx: Tx, id: string): Promise<FloorRow | null> {
  const rows = await tx.delete(floor).where(eq(floor.id, id)).returning();
  const row = rows[0];
  return row === undefined ? null : toFloorRow(row);
}

export async function listRoomsByFloor(db: Db, floorId: string): Promise<RoomRow[]> {
  const rows = await db
    .select()
    .from(room)
    .where(eq(room.floorId, floorId))
    .orderBy(room.roomCode);
  return rows.map(toRoomRow);
}

export async function findRoomById(db: Db, id: string): Promise<RoomRow | null> {
  const rows = await db.select().from(room).where(eq(room.id, id)).limit(1);
  const row = rows[0];
  return row === undefined ? null : toRoomRow(row);
}

export async function findRoomByBuildingAndCode(
  db: Db,
  buildingId: string,
  roomCode: string,
): Promise<RoomRow | null> {
  const rows = await db
    .select()
    .from(room)
    .where(and(eq(room.buildingId, buildingId), eq(room.roomCode, roomCode)))
    .limit(1);
  const row = rows[0];
  return row === undefined ? null : toRoomRow(row);
}

export async function listRoomsByBuilding(db: Db, buildingId: string): Promise<RoomRow[]> {
  const rows = await db
    .select()
    .from(room)
    .where(eq(room.buildingId, buildingId))
    .orderBy(room.roomCode);
  return rows.map(toRoomRow);
}

export async function listAllRooms(db: Db): Promise<RoomRow[]> {
  const rows = await db.select().from(room).orderBy(room.roomCode);
  return rows.map(toRoomRow);
}

export async function listRoomsByIds(db: Db, ids: string[]): Promise<RoomRow[]> {
  if (ids.length === 0) return [];
  const result: RoomRow[] = [];
  for (const id of ids) {
    const found = await findRoomById(db, id);
    if (found !== null) result.push(found);
  }
  return result;
}

export async function insertRoom(
  tx: Tx,
  input: {
    floorId: string;
    buildingId: string;
    roomCode: string;
    areaSqm: string;
    status: 'ACTIVE' | 'INACTIVE';
  },
): Promise<RoomRow> {
  const rows = await tx.insert(room).values(input).returning();
  const row = rows[0];
  if (row === undefined) throw new Error('Room insert returned no row.');
  return toRoomRow(row);
}

export async function updateRoom(
  tx: Tx,
  id: string,
  input: { areaSqm?: string | undefined; status?: 'ACTIVE' | 'INACTIVE' | undefined },
): Promise<RoomRow | null> {
  const rows = await tx
    .update(room)
    .set({ ...(input.areaSqm !== undefined ? { areaSqm: input.areaSqm } : {}), ...(input.status !== undefined ? { status: input.status } : {}) })
    .where(eq(room.id, id))
    .returning();
  const row = rows[0];
  return row === undefined ? null : toRoomRow(row);
}
