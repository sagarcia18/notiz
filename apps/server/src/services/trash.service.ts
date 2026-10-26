import { type PageSummary, type TrashEntry, sortKeyBetween } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { NotFoundError } from '../errors.js';
import * as repo from '../repositories/pages.repository.js';
import type { PageRow } from '../repositories/pages.repository.js';
import { requireActivePage, toSummary } from './pages.service.js';

function requireTrashedPage(db: AppDatabase, id: string): PageRow & { deletedAt: string } {
  const row = repo.findPage(db, id);
  if (!row || row.deletedAt === null) {
    throw new NotFoundError('Trashed page', id);
  }
  return { ...row, deletedAt: row.deletedAt };
}

export function trashPage(db: AppDatabase, id: string): void {
  db.transaction(() => {
    requireActivePage(db, id);
    repo.trashSubtree(db, id, new Date().toISOString());
  });
}

export function listTrash(db: AppDatabase): TrashEntry[] {
  return repo.listTrashRoots(db).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    icon: row.icon,
    deletedAt: row.deletedAt ?? '',
  }));
}

function isParentActive(db: AppDatabase, parentId: string | null): boolean {
  if (parentId === null) {
    return true;
  }
  return repo.findPage(db, parentId)?.deletedAt === null;
}

/**
 * Restores the page with the subpages trashed together with it. When its
 * parent is still in the trash, the page moves to the top level.
 */
export function restorePage(db: AppDatabase, id: string): PageSummary {
  return db.transaction(() => {
    const row = requireTrashedPage(db, id);
    repo.restoreSubtree(db, id, row.deletedAt);
    if (!isParentActive(db, row.parentId)) {
      const roots = repo.listActiveChildren(db, null).filter((page) => page.id !== id);
      const sortOrder = sortKeyBetween(roots.at(-1)?.sortOrder ?? null, null);
      return toSummary(repo.updatePage(db, id, { parentId: null, sortOrder }));
    }
    return toSummary(requireActivePage(db, id));
  });
}

export function purgePage(db: AppDatabase, id: string): void {
  db.transaction(() => {
    requireTrashedPage(db, id);
    repo.purgeSubtree(db, id);
  });
}

export function emptyTrash(db: AppDatabase): void {
  db.transaction(() => {
    repo.purgeAllTrashed(db);
  });
}
