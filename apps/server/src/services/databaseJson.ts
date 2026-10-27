import {
  type DatabaseProperty,
  type DatabaseView,
  type PropertyOption,
  type PropertyValues,
  type ViewConfig,
  propertyOptionSchema,
  propertyValuesSchema,
  viewConfigSchema,
} from '@notiz/shared';
import { z } from 'zod';
import type { PropertyRow, ViewRow } from '../repositories/databases.repository.js';

const optionsSchema = z.array(propertyOptionSchema);
const propertyConfigSchema = z.object({ relationDatabaseId: z.string().optional() });

export function relationConfigJson(relationDatabaseId: string | null): string {
  return JSON.stringify(relationDatabaseId === null ? {} : { relationDatabaseId });
}

export function parseOptions(json: string): PropertyOption[] {
  return optionsSchema.parse(JSON.parse(json) as unknown);
}

export function parseConfig(json: string): ViewConfig {
  return viewConfigSchema.parse(JSON.parse(json) as unknown);
}

export function parseValues(json: string | null): PropertyValues {
  return json === null ? {} : propertyValuesSchema.parse(JSON.parse(json) as unknown);
}

export function toProperty(row: PropertyRow): DatabaseProperty {
  return {
    id: row.id,
    databaseId: row.databaseId,
    name: row.name,
    type: row.type,
    options: parseOptions(row.optionsJson),
    relationDatabaseId:
      row.type === 'relation'
        ? (propertyConfigSchema.parse(JSON.parse(row.configJson) as unknown).relationDatabaseId ??
          null)
        : null,
    sortOrder: row.sortOrder,
  };
}

export function toView(row: ViewRow): DatabaseView {
  return {
    id: row.id,
    databaseId: row.databaseId,
    type: row.type,
    name: row.name,
    config: parseConfig(row.configJson),
    sortOrder: row.sortOrder,
  };
}
