import type { PropertyType, ViewType } from '@notiz/shared';
import { asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { dbProperties, dbViews } from '../db/schema.js';

export type PropertyRow = typeof dbProperties.$inferSelect;
export type ViewRow = typeof dbViews.$inferSelect;

export interface NewPropertyRow {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  optionsJson: string;
  configJson?: string;
  sortOrder: string;
}

export interface PropertyPatch {
  name?: string;
  type?: PropertyType;
  optionsJson?: string;
  configJson?: string;
}

export interface NewViewRow {
  id: string;
  databaseId: string;
  type: ViewType;
  name: string;
  configJson: string;
  sortOrder: string;
}

export interface ViewPatch {
  name?: string;
  configJson?: string;
}

export function listProperties(db: AppDatabase, databaseId: string): PropertyRow[] {
  return db
    .select()
    .from(dbProperties)
    .where(eq(dbProperties.databaseId, databaseId))
    .orderBy(asc(dbProperties.sortOrder))
    .all();
}

export function findProperty(db: AppDatabase, id: string): PropertyRow | undefined {
  return db.select().from(dbProperties).where(eq(dbProperties.id, id)).get();
}

export function insertProperty(db: AppDatabase, row: NewPropertyRow): PropertyRow {
  return db.insert(dbProperties).values(row).returning().get();
}

export function updateProperty(db: AppDatabase, id: string, patch: PropertyPatch): PropertyRow {
  return db.update(dbProperties).set(patch).where(eq(dbProperties.id, id)).returning().get();
}

export function deleteProperty(db: AppDatabase, id: string): void {
  db.delete(dbProperties).where(eq(dbProperties.id, id)).run();
}

export function listViews(db: AppDatabase, databaseId: string): ViewRow[] {
  return db
    .select()
    .from(dbViews)
    .where(eq(dbViews.databaseId, databaseId))
    .orderBy(asc(dbViews.sortOrder))
    .all();
}

export function findView(db: AppDatabase, id: string): ViewRow | undefined {
  return db.select().from(dbViews).where(eq(dbViews.id, id)).get();
}

export function insertView(db: AppDatabase, row: NewViewRow): ViewRow {
  return db.insert(dbViews).values(row).returning().get();
}

export function updateView(db: AppDatabase, id: string, patch: ViewPatch): ViewRow {
  return db.update(dbViews).set(patch).where(eq(dbViews.id, id)).returning().get();
}

export function deleteView(db: AppDatabase, id: string): void {
  db.delete(dbViews).where(eq(dbViews.id, id)).run();
}
