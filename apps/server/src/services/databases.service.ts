import { randomUUID } from 'node:crypto';
import {
  type CreatePropertyInput,
  type DatabaseDetail,
  type DatabaseProperty,
  type PropertyValue,
  type UpdatePropertyInput,
  type ViewConfig,
  convertPropertyValue,
  sortKeyBetween,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../repositories/databases.repository.js';
import * as pagesRepo from '../repositories/pages.repository.js';
import type { PageRow } from '../repositories/pages.repository.js';
import { parseConfig, parseValues, toProperty, toView } from './databaseJson.js';
import { normalizeOptions } from './databaseSetup.js';

export function requireDatabase(db: AppDatabase, id: string): PageRow {
  const row = pagesRepo.findPage(db, id);
  if (!row || row.deletedAt !== null || row.kind !== 'database') {
    throw new NotFoundError('Database', id);
  }
  return row;
}

export function listDatabaseProperties(db: AppDatabase, databaseId: string): DatabaseProperty[] {
  return repo.listProperties(db, databaseId).map(toProperty);
}

export function getDatabase(db: AppDatabase, id: string): DatabaseDetail {
  requireDatabase(db, id);
  return {
    id,
    properties: listDatabaseProperties(db, id),
    views: repo.listViews(db, id).map(toView),
  };
}

function requireProperty(db: AppDatabase, id: string): DatabaseProperty {
  const row = repo.findProperty(db, id);
  if (!row) {
    throw new NotFoundError('Property', id);
  }
  requireDatabase(db, row.databaseId);
  return toProperty(row);
}

export function createProperty(
  db: AppDatabase,
  databaseId: string,
  input: CreatePropertyInput,
): DatabaseProperty {
  return db.transaction(() => {
    requireDatabase(db, databaseId);
    const last = repo.listProperties(db, databaseId).at(-1);
    const row = repo.insertProperty(db, {
      id: randomUUID(),
      databaseId,
      name: input.name,
      type: input.type,
      optionsJson: JSON.stringify(normalizeOptions(input.type, input.options)),
      sortOrder: sortKeyBetween(last?.sortOrder ?? null, null),
    });
    return toProperty(row);
  });
}

/** Applies `change` to the property's value in every row of the database, trashed rows included. */
function rewriteRowValues(
  db: AppDatabase,
  property: DatabaseProperty,
  change: (value: PropertyValue) => PropertyValue,
): void {
  for (const row of pagesRepo.listAllChildren(db, property.databaseId)) {
    const values = parseValues(row.propertiesJson);
    const current = values[property.id];
    if (current === undefined) continue;
    const next = change(current);
    if (next === current) continue;
    const others = Object.entries(values).filter(([key]) => key !== property.id);
    const updated = next === null ? others : [...others, [property.id, next] as const];
    pagesRepo.setPropertiesJson(db, row.id, JSON.stringify(Object.fromEntries(updated)));
  }
}

/** Rewrites every view config of the database whose content `prune` changes. */
function pruneViews(
  db: AppDatabase,
  databaseId: string,
  prune: (config: ViewConfig) => ViewConfig,
): void {
  for (const view of repo.listViews(db, databaseId)) {
    const before = parseConfig(view.configJson);
    const after = prune(before);
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      repo.updateView(db, view.id, { configJson: JSON.stringify(after) });
    }
  }
}

function withoutProperty(config: ViewConfig, propertyId: string): ViewConfig {
  return {
    filters: config.filters.filter((filter) => filter.propertyId !== propertyId),
    sorts: config.sorts.filter((sort) => sort.propertyId !== propertyId),
    columns: config.columns.filter((column) => column.propertyId !== propertyId),
    groupByPropertyId: config.groupByPropertyId === propertyId ? null : config.groupByPropertyId,
    cardPropertyIds: config.cardPropertyIds.filter((id) => id !== propertyId),
  };
}

/** After a type change, filters and grouping on the property no longer fit. */
function afterTypeChange(config: ViewConfig, property: DatabaseProperty): ViewConfig {
  const canGroup = property.type === 'select' || property.type === 'status';
  return {
    ...config,
    filters: config.filters.filter((filter) => filter.propertyId !== property.id),
    groupByPropertyId:
      config.groupByPropertyId === property.id && !canGroup ? null : config.groupByPropertyId,
  };
}

export function updateProperty(
  db: AppDatabase,
  id: string,
  input: UpdatePropertyInput,
): DatabaseProperty {
  return db.transaction(() => {
    const before = requireProperty(db, id);
    if (before.type === 'title' && (input.type !== undefined || input.options !== undefined)) {
      throw new ValidationError('The title property can only be renamed');
    }
    const type = input.type ?? before.type;
    const options = normalizeOptions(type, input.options ?? before.options);
    const row = repo.updateProperty(db, id, {
      name: input.name,
      type,
      optionsJson: JSON.stringify(options),
    });
    const after = toProperty(row);
    if (type !== before.type || JSON.stringify(options) !== JSON.stringify(before.options)) {
      rewriteRowValues(db, before, (value) => convertPropertyValue(value, before, after));
    }
    if (type !== before.type) {
      pruneViews(db, after.databaseId, (config) => afterTypeChange(config, after));
    }
    return after;
  });
}

export function deleteProperty(db: AppDatabase, id: string): void {
  db.transaction(() => {
    const property = requireProperty(db, id);
    if (property.type === 'title') {
      throw new ValidationError('The title property cannot be deleted');
    }
    rewriteRowValues(db, property, () => null);
    pruneViews(db, property.databaseId, (config) => withoutProperty(config, id));
    repo.deleteProperty(db, id);
  });
}
