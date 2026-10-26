import type { PageKind } from '@notiz/shared';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
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
}

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export function findPage(db: AppDatabase, id: string): PageRow | undefined {
  return db.select().from(pages).where(eq(pages.id, id)).get();
}

export function listActivePages(db: AppDatabase): PageRow[] {
  return db
    .select()
    .from(pages)
    .where(and(isNull(pages.deletedAt), eq(pages.isTemplate, false)))
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

/** Permanently deletes the page, every descendant and their search rows. */
export function purgeSubtree(db: AppDatabase, id: string): void {
  const subtree = sql`
    with recursive subtree(id) as (
      select id from pages where id = ${id}
      union all
      select p.id from pages p join subtree s on p.parent_id = s.id
    )`;
  db.run(sql`${subtree} delete from pages_fts where page_id in (select id from subtree)`);
  db.run(sql`${subtree} delete from pages where id in (select id from subtree)`);
}

/** Permanently deletes every trashed page. Trashed pages never have active children. */
export function purgeAllTrashed(db: AppDatabase): void {
  db.run(
    sql`delete from pages_fts where page_id in (select id from pages where deleted_at is not null)`,
  );
  db.run(sql`delete from pages where deleted_at is not null`);
}

export function insertSearchEntry(db: AppDatabase, pageId: string, title: string): void {
  db.run(sql`insert into pages_fts (page_id, title, body) values (${pageId}, ${title}, '')`);
}

export function updateSearchTitle(db: AppDatabase, pageId: string, title: string): void {
  db.run(sql`update pages_fts set title = ${title} where page_id = ${pageId}`);
}
