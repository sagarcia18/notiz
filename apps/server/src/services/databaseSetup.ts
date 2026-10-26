import { randomUUID } from 'node:crypto';
import {
  type DatabaseProperty,
  type PropertyOption,
  type PropertyOptionInput,
  type PropertyType,
  type ViewConfig,
  type ViewType,
  sortKeyBetween,
  viewConfigSchema,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import * as repo from '../repositories/databases.repository.js';

const defaultStatusOptions: PropertyOptionInput[] = [
  { name: 'Not started', color: 'gray', group: 'todo' },
  { name: 'In progress', color: 'blue', group: 'in_progress' },
  { name: 'Done', color: 'green', group: 'complete' },
];

/**
 * Options as stored for a property type: ids filled in, `group` kept only for
 * status (defaulting to `todo`), and no options for non-choice types.
 */
export function normalizeOptions(
  type: PropertyType,
  inputs: PropertyOptionInput[] | undefined,
): PropertyOption[] {
  if (type !== 'select' && type !== 'status') {
    return [];
  }
  const source = inputs ?? (type === 'status' ? defaultStatusOptions : []);
  return source.map(({ id, name, color, group }) => {
    const option: PropertyOption = { id: id ?? randomUUID(), name, color };
    if (type === 'status') {
      option.group = group ?? 'todo';
    }
    return option;
  });
}

/** Boards group by the first status property, else the first select property. */
export function defaultViewConfig(type: ViewType, properties: DatabaseProperty[]): ViewConfig {
  const config = viewConfigSchema.parse({});
  if (type === 'board') {
    const groupBy =
      properties.find((property) => property.type === 'status') ??
      properties.find((property) => property.type === 'select');
    config.groupByPropertyId = groupBy?.id ?? null;
  }
  return config;
}

/** Gives a new database page its title property and a table view. */
export function initDatabase(db: AppDatabase, databaseId: string): void {
  repo.insertProperty(db, {
    id: randomUUID(),
    databaseId,
    name: 'Name',
    type: 'title',
    optionsJson: '[]',
    sortOrder: sortKeyBetween(null, null),
  });
  repo.insertView(db, {
    id: randomUUID(),
    databaseId,
    type: 'table',
    name: 'Table',
    configJson: JSON.stringify(defaultViewConfig('table', [])),
    sortOrder: sortKeyBetween(null, null),
  });
}
