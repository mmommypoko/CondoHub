import { sql } from 'drizzle-orm';
import { check, foreignKey, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const buildingStatus = pgEnum('building_status', ['ACTIVE', 'INACTIVE']);

export type BuildingStatus = (typeof buildingStatus.enumValues)[number];

export const roomStatus = pgEnum('room_status', ['ACTIVE', 'INACTIVE']);

export type RoomStatus = (typeof roomStatus.enumValues)[number];

export const building = pgTable(
  'building',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    status: buildingStatus('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique('building_project_code_uq').on(table.projectId, table.code)],
);

export const floor = pgTable(
  'floor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buildingId: uuid('building_id')
      .notNull()
      .references(() => building.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
  },
  (table) => [
    unique('floor_building_code_uq').on(table.buildingId, table.code),
    unique('floor_id_building_uq').on(table.id, table.buildingId),
  ],
);

export const room = pgTable(
  'room',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    floorId: uuid('floor_id').notNull(),
    buildingId: uuid('building_id').notNull(),
    roomCode: text('room_code').notNull(),
    areaSqm: numeric('area_sqm').notNull(),
    status: roomStatus('status').notNull(),
  },
  (table) => [
    unique('room_building_code_uq').on(table.buildingId, table.roomCode),
    foreignKey({
      name: 'room_floor_building_fk',
      columns: [table.floorId, table.buildingId],
      foreignColumns: [floor.id, floor.buildingId],
    })
      .onDelete('restrict')
      .onUpdate('cascade'),
    check('room_area_positive_ck', sql`"area_sqm" > 0`),
  ],
);
