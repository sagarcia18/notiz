import { asc, eq, sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { dashboardWidgets } from '../db/schema.js';

export type WidgetRow = typeof dashboardWidgets.$inferSelect;

export interface NewWidgetRow {
  id: string;
  dashboardId: string;
  configJson: string;
  layoutJson: string;
}

export interface WidgetPatch {
  configJson?: string;
  layoutJson?: string;
}

export function listWidgets(db: AppDatabase, dashboardId: string): WidgetRow[] {
  return (
    db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.dashboardId, dashboardId))
      // rowid breaks ties between widgets created in the same millisecond (insertion order).
      .orderBy(asc(dashboardWidgets.createdAt), asc(sql`rowid`))
      .all()
  );
}

export function findWidget(db: AppDatabase, id: string): WidgetRow | undefined {
  return db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, id)).get();
}

export function insertWidget(db: AppDatabase, row: NewWidgetRow): WidgetRow {
  return db.insert(dashboardWidgets).values(row).returning().get();
}

export function updateWidget(db: AppDatabase, id: string, patch: WidgetPatch): WidgetRow {
  return db
    .update(dashboardWidgets)
    .set(patch)
    .where(eq(dashboardWidgets.id, id))
    .returning()
    .get();
}

export function deleteWidget(db: AppDatabase, id: string): void {
  db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id)).run();
}
