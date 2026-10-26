import { randomUUID } from 'node:crypto';
import { type CreateRowInput, type DatabaseRow, sortKeyBetween } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import * as pagesRepo from '../repositories/pages.repository.js';
import type { PageRow } from '../repositories/pages.repository.js';
import { parseValues } from './databaseJson.js';
import { requireDatabase } from './databases.service.js';
import { mergeRowValues } from './rowValues.js';

function toRow(page: PageRow): DatabaseRow {
  return {
    id: page.id,
    title: page.title,
    icon: page.icon,
    sortOrder: page.sortOrder,
    properties: parseValues(page.propertiesJson),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

/** Active rows of the database in manual order. */
export function listRows(db: AppDatabase, databaseId: string): DatabaseRow[] {
  return pagesRepo.listActiveChildren(db, databaseId).map(toRow);
}

export function createRow(db: AppDatabase, databaseId: string, input: CreateRowInput): DatabaseRow {
  return db.transaction(() => {
    requireDatabase(db, databaseId);
    const last = pagesRepo.listActiveChildren(db, databaseId).at(-1);
    const id = randomUUID();
    const title = input.title ?? '';
    pagesRepo.insertPage(db, {
      id,
      parentId: databaseId,
      kind: 'doc',
      title,
      sortOrder: sortKeyBetween(last?.sortOrder ?? null, null),
    });
    const propertiesJson = mergeRowValues(db, databaseId, null, input.properties ?? {});
    const row = pagesRepo.updatePage(db, id, { propertiesJson });
    pagesRepo.insertSearchEntry(db, id, title);
    return toRow(row);
  });
}
