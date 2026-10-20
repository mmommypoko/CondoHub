import 'server-only';
import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
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
  name: string;
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
    name: row.name || row.roomCode,
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
    .set({
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.label !== undefined ? { label: input.label } : {}),
    })
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
  const rows = await db.select().from(room).where(eq(room.floorId, floorId)).orderBy(room.roomCode);
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
    name?: string | undefined;
    areaSqm: string;
    status: 'ACTIVE' | 'INACTIVE';
  },
): Promise<RoomRow> {
  const rows = await tx
    .insert(room)
    .values({ ...input, name: input.name ?? input.roomCode })
    .returning();
  const row = rows[0];
  if (row === undefined) throw new Error('Room insert returned no row.');
  return toRoomRow(row);
}

export async function updateRoom(
  tx: Tx,
  id: string,
  input: {
    name?: string | undefined;
    areaSqm?: string | undefined;
    status?: 'ACTIVE' | 'INACTIVE' | undefined;
  },
): Promise<RoomRow | null> {
  const rows = await tx
    .update(room)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.areaSqm !== undefined ? { areaSqm: input.areaSqm } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(eq(room.id, id))
    .returning();
  const row = rows[0];
  return row === undefined ? null : toRoomRow(row);
}

export async function queryBuildingPage(
  conn: Db,
  input: { page: number; pageSize: number; query?: string | undefined },
) {
  const search = input.query?.trim();
  const where = search ? ilike(building.name, `%${search.replace(/[\\%_]/g, '\\$&')}%`) : undefined;
  const [rows, counted] = await Promise.all([
    conn
      .select({
        id: building.id,
        projectId: building.projectId,
        code: building.code,
        name: building.name,
        status: building.status,
        floorCount:
          sql<number>`(select count(*) from ${floor} where ${floor.buildingId} = ${building.id})`.mapWith(
            Number,
          ),
        roomCount:
          sql<number>`(select count(*) from ${room} where ${room.buildingId} = ${building.id})`.mapWith(
            Number,
          ),
      })
      .from(building)
      .where(where)
      .orderBy(building.name, building.id)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    conn
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(building)
      .where(where),
  ]);
  return { rows, total: counted[0]?.total ?? 0 };
}

export async function queryRoomPage(
  conn: Db,
  input: { roomIds: string[] | null; query?: string | undefined; page: number; pageSize: number },
) {
  if (input.roomIds !== null && input.roomIds.length === 0) return { rows: [], total: 0 };
  const search = input.query?.trim();
  const name = sql<string>`coalesce(nullif(${room.name}, ''), ${room.roomCode})`;
  const pattern = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null;
  const where = and(
    input.roomIds === null ? undefined : inArray(room.id, input.roomIds),
    pattern ? or(ilike(name, pattern), ilike(building.name, pattern)) : undefined,
  );
  const [rows, counted] = await Promise.all([
    conn
      .select({
        id: room.id,
        name,
        buildingName: building.name,
        floorLabel: floor.label,
        areaSqm: room.areaSqm,
        status: room.status,
      })
      .from(room)
      .innerJoin(building, eq(room.buildingId, building.id))
      .innerJoin(floor, eq(room.floorId, floor.id))
      .where(where)
      .orderBy(building.name, name, room.id)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    conn
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(room)
      .innerJoin(building, eq(room.buildingId, building.id))
      .where(where),
  ]);
  return { rows, total: counted[0]?.total ?? 0 };
}

export async function listRoomLabels(conn: Db, roomIds: string[]) {
  if (roomIds.length === 0) return [];
  const rows = await conn
    .select({
      id: room.id,
      name: room.name,
      roomCode: room.roomCode,
      buildingName: building.name,
      floorLabel: floor.label,
    })
    .from(room)
    .innerJoin(building, eq(room.buildingId, building.id))
    .innerJoin(floor, eq(room.floorId, floor.id))
    .where(inArray(room.id, roomIds));
  return rows.map((row) => ({
    id: row.id,
    name: row.name || row.roomCode,
    buildingName: row.buildingName,
    floorLabel: row.floorLabel,
    label: `${row.buildingName} · ${row.name || row.roomCode}`,
  }));
}

export async function updateBuildingDetails(
  tx: Tx,
  id: string,
  input: { name?: string | undefined; status?: 'ACTIVE' | 'INACTIVE' | undefined },
) {
  const rows = await tx
    .update(building)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(building.id, id))
    .returning();
  return rows[0] ? toBuildingRow(rows[0]) : null;
}
