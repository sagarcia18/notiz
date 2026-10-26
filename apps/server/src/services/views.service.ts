import { randomUUID } from 'node:crypto';
import {
  type CreateViewInput,
  type DatabaseRow,
  type DatabaseView,
  type UpdateViewInput,
  sortKeyBetween,
  viewConfigSchema,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ConflictError, NotFoundError } from '../errors.js';
import * as repo from '../repositories/databases.repository.js';
import type { ViewRow } from '../repositories/databases.repository.js';
import { toView } from './databaseJson.js';
import { defaultViewConfig } from './databaseSetup.js';
import { listDatabaseProperties, requireDatabase } from './databases.service.js';
import { filterRows, sortRows } from './rowQuery.js';
import { listRows } from './rows.service.js';

const defaultViewNames = { table: 'Table', board: 'Board' } as const;

function requireView(db: AppDatabase, id: string): ViewRow {
  const row = repo.findView(db, id);
  if (!row) {
    throw new NotFoundError('View', id);
  }
  requireDatabase(db, row.databaseId);
  return row;
}

export function createView(
  db: AppDatabase,
  databaseId: string,
  input: CreateViewInput,
): DatabaseView {
  return db.transaction(() => {
    requireDatabase(db, databaseId);
    const properties = listDatabaseProperties(db, databaseId);
    const last = repo.listViews(db, databaseId).at(-1);
    const row = repo.insertView(db, {
      id: randomUUID(),
      databaseId,
      type: input.type,
      name: input.name ?? defaultViewNames[input.type],
      configJson: JSON.stringify(defaultViewConfig(input.type, properties)),
      sortOrder: sortKeyBetween(last?.sortOrder ?? null, null),
    });
    return toView(row);
  });
}

export function updateView(db: AppDatabase, id: string, input: UpdateViewInput): DatabaseView {
  return db.transaction(() => {
    requireView(db, id);
    const config = input.config === undefined ? undefined : viewConfigSchema.parse(input.config);
    const row = repo.updateView(db, id, {
      name: input.name,
      configJson: config === undefined ? undefined : JSON.stringify(config),
    });
    return toView(row);
  });
}

export function deleteView(db: AppDatabase, id: string): void {
  db.transaction(() => {
    const view = requireView(db, id);
    if (repo.listViews(db, view.databaseId).length <= 1) {
      throw new ConflictError('A database needs at least one view');
    }
    repo.deleteView(db, id);
  });
}

/** The database rows the view shows, filtered and sorted by its config. */
export function listViewRows(db: AppDatabase, id: string): DatabaseRow[] {
  const view = toView(requireView(db, id));
  const properties = new Map(
    listDatabaseProperties(db, view.databaseId).map((property) => [property.id, property]),
  );
  const rows = filterRows(listRows(db, view.databaseId), properties, view.config.filters);
  return sortRows(rows, properties, view.config.sorts);
}
