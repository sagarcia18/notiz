import type { PageKind } from '@notiz/shared';
import { type SQL, and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { pages } from '../db/schema.js';

export type PageRow = typeof pages.$inferSelect;

export interface NewPageRow {
  id: string;
  parentId: string | null;
  kind: PageKind;
  title: string;
  sortOrder: string;
}

export interface PagePatch {
  title?: string;
  icon?: string | null;
  parentId?: string | null;
  sortOrder?: string;
  contentJson?: string;
  propertiesJson?: string;
}

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export function findPage(db: AppDatabase, id: string): PageRow | undefined {
  return db.select().from(pages).where(eq(pages.id, id)).get();
}

/** Active, non-template pages without database rows (rows live inside their database). */
export function listActivePages(db: AppDatabase): PageRow[] {
  const isDatabaseRow = sql`exists (
    select 1 from pages parent where parent.id = ${pages.parentId} and parent.kind = 'database')`;
  return db
    .select()
    .from(pages)
    .where(and(isNull(pages.deletedAt), eq(pages.isTemplate, false), sql`not ${isDatabaseRow}`))
    .orderBy(asc(pages.sortOrder))
    .all();
}

export function listActiveChildren(db: AppDatabase, parentId: string | null): PageRow[] {
  const parentFilter = parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId);
  return db
    .select()
    .from(pages)
    .where(and(parentFilter, isNull(pages.deletedAt)))
    .orderBy(asc(pages.sortOrder))
    .all();
}

/** All children including trashed ones, e.g. to rewrite database row values. */
export function listAllChildren(db: AppDatabase, parentId: string): PageRow[] {
  return db.select().from(pages).where(eq(pages.parentId, parentId)).all();
}

/** Rewrites stored row values without touching `updated_at` (schema-driven change). */
export function setPropertiesJson(db: AppDatabase, id: string, propertiesJson: string): void {
  db.update(pages).set({ propertiesJson }).where(eq(pages.id, id)).run();
}

export function insertPage(db: AppDatabase, row: NewPageRow): PageRow {
  return db.insert(pages).values(row).returning().get();
}

export function updatePage(db: AppDatabase, id: string, patch: PagePatch): PageRow {
  return db
    .update(pages)
    .set({ ...patch, updatedAt: now })
    .where(eq(pages.id, id))
    .returning()
    .get();
}

/** True when `ancestorId` is `pageId` itself or one of its ancestors. */
export function isSelfOrAncestor(db: AppDatabase, ancestorId: string, pageId: string): boolean {
  const row = db.get<{ found: number }>(sql`
    with recursive chain(id, parent_id) as (
      select id, parent_id from pages where id = ${pageId}
      union all
      select p.id, p.parent_id from pages p join chain c on p.id = c.parent_id
    )
    select count(*) as found from chain where id = ${ancestorId}`);
  return row.found > 0;
}

/** Soft-deletes the page and all of its active descendants with one timestamp. */
export function trashSubtree(db: AppDatabase, id: string, deletedAt: string): void {
  db.run(sql`
    with recursive subtree(id) as (
      select id from pages where id = ${id}
      union all
      select p.id from pages p join subtree s on p.parent_id = s.id where p.deleted_at is null
    )
    update pages set deleted_at = ${deletedAt}, updated_at = ${deletedAt}
    where id in (select id from subtree)`);
}

/** Restores the page and the descendants that were trashed together with it. */
export function restoreSubtree(db: AppDatabase, id: string, deletedAt: string): void {
  db.run(sql`
    with recursive subtree(id) as (
      select id from pages where id = ${id}
      union all
      select p.id from pages p join subtree s on p.parent_id = s.id where p.deleted_at = ${deletedAt}
    )
    update pages set deleted_at = null, updated_at = ${now}
    where id in (select id from subtree)`);
}

/** Pages the user trashed directly (not the ones that went along with a parent). */
export function listTrashRoots(db: AppDatabase): PageRow[] {
  const rows = db.all<{ id: string }>(sql`
    select p.id from pages p
    left join pages parent on parent.id = p.parent_id
    where p.deleted_at is not null
      and (parent.id is null or parent.deleted_at is null or parent.deleted_at <> p.deleted_at)`);
  const ids = new Set(rows.map((row) => row.id));
  return db
    .select()
    .from(pages)
    .where(sql`${pages.deletedAt} is not null`)
    .orderBy(desc(pages.deletedAt))
    .all()
    .filter((page) => ids.has(page.id));
}

/** Deletes the pages selected by `idsQuery` with their search and attachment rows. */
function purgeWhere(db: AppDatabase, prefix: SQL, idsQuery: SQL): string[] {
  const ids = db.all<{ id: string }>(sql`${prefix} ${idsQuery}`).map((row) => row.id);
  db.run(sql`${prefix} delete from pages_fts where page_id in (${idsQuery})`);
  db.run(sql`${prefix} delete from attachments where page_id in (${idsQuery})`);
  db.run(sql`${prefix} delete from db_properties where database_id in (${idsQuery})`);
  db.run(sql`${prefix} delete from db_views where database_id in (${idsQuery})`);
  db.run(sql`${prefix} delete from dashboard_widgets where dashboard_id in (${idsQuery})`);
  db.run(sql`${prefix} delete from pages where id in (${idsQuery})`);
  return ids;
}

/** Permanently deletes the page and every descendant; returns the deleted ids. */
export function purgeSubtree(db: AppDatabase, id: string): string[] {
  const subtree = sql`
    with recursive subtree(id) as (
      select id from pages where id = ${id}
      union all
      select p.id from pages p join subtree s on p.parent_id = s.id
    )`;
  return purgeWhere(db, subtree, sql`select id from subtree`);
}

/** Permanently deletes every trashed page; returns the deleted ids. Trashed pages never have active children. */
export function purgeAllTrashed(db: AppDatabase): string[] {
  return purgeWhere(db, sql``, sql`select id from pages where deleted_at is not null`);
}

export function insertSearchEntry(db: AppDatabase, pageId: string, title: string): void {
  db.run(sql`insert into pages_fts (page_id, title, body) values (${pageId}, ${title}, '')`);
}

export function updateSearchTitle(db: AppDatabase, pageId: string, title: string): void {
  db.run(sql`update pages_fts set title = ${title} where page_id = ${pageId}`);
}

export function updateSearchBody(db: AppDatabase, pageId: string, body: string): void {
  db.run(sql`update pages_fts set body = ${body} where page_id = ${pageId}`);
}
