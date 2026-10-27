import {
  type DatabaseProperty,
  type PropertyValue,
  type PropertyValues,
  isValidPropertyValue,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import { listProperties } from '../repositories/databases.repository.js';
import { findPage } from '../repositories/pages.repository.js';
import { parseValues, toProperty } from './databaseJson.js';

function isActiveRowOf(db: AppDatabase, rowId: string, databaseId: string | null): boolean {
  const row = findPage(db, rowId);
  return row !== undefined && row.deletedAt === null && row.parentId === databaseId;
}

/** New relation ids must be active rows of the target; ids already stored may stay (trashed ones too). */
function hasValidRelationRows(
  db: AppDatabase,
  property: DatabaseProperty,
  value: PropertyValue,
  stored: PropertyValue | undefined,
): boolean {
  if (property.type !== 'relation' || !Array.isArray(value)) return true;
  const kept = new Set(Array.isArray(stored) ? stored : []);
  return value.every(
    (rowId) => kept.has(rowId) || isActiveRowOf(db, rowId, property.relationDatabaseId),
  );
}

/**
 * Merges `patch` into a row's stored values after checking every key against
 * the database's properties. `null` removes a value. The title lives in the
 * page title, so it cannot be set here.
 */
export function mergeRowValues(
  db: AppDatabase,
  databaseId: string,
  currentJson: string | null,
  patch: PropertyValues,
): string {
  const properties = new Map(
    listProperties(db, databaseId).map((row) => [row.id, toProperty(row)]),
  );
  const values = new Map(Object.entries(parseValues(currentJson)));
  for (const [propertyId, value] of Object.entries(patch)) {
    const property = properties.get(propertyId);
    if (!property || property.type === 'title') {
      throw new ValidationError(`Property ${propertyId} cannot be set on this row`);
    }
    if (
      !isValidPropertyValue(property, value) ||
      !hasValidRelationRows(db, property, value, values.get(propertyId))
    ) {
      throw new ValidationError(`Invalid value for property "${property.name}"`);
    }
    if (value === null) {
      values.delete(propertyId);
    } else {
      values.set(propertyId, value);
    }
  }
  return JSON.stringify(Object.fromEntries(values));
}
