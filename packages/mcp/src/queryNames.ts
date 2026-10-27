import {
  type DatabaseDetail,
  type DatabaseProperty,
  type DatabaseRow,
  type FilterOperator,
  type PropertyValue,
  type ViewFilter,
  type ViewSort,
  hasOptions,
  optionIdsOf,
  statusGroupSchema,
} from '@notiz/shared';
import { NotizApiError } from './apiClient.js';

/** A filter as Claude writes it: property and option by name (or id). */
export interface NamedFilter {
  property: string;
  operator: FilterOperator;
  value?: string | number | undefined;
}

export interface NamedSort {
  property: string;
  direction: 'asc' | 'desc';
}

const optionOperators = new Set<FilterOperator>([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
]);

function invalid(message: string): NotizApiError {
  return new NotizApiError('validation_failed', message);
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
}

/** Finds a property by id or case-insensitive name. */
export function resolveProperty(database: DatabaseDetail, ref: string): DatabaseProperty {
  const property =
    database.properties.find((candidate) => candidate.id === ref) ??
    database.properties.find((candidate) => sameName(candidate.name, ref));
  if (!property) {
    const names = database.properties.map((candidate) => `"${candidate.name}"`).join(', ');
    throw invalid(`Unknown property "${ref}"; properties are ${names}`);
  }
  return property;
}

function resolveOptionId(property: DatabaseProperty, value: string | number): string {
  const text = String(value);
  const option =
    property.options.find((candidate) => candidate.id === text) ??
    property.options.find((candidate) => sameName(candidate.name, text));
  if (!option) {
    const names = property.options.map((candidate) => `"${candidate.name}"`).join(', ');
    throw invalid(`"${text}" is not an option of "${property.name}"; options are ${names}`);
  }
  return option.id;
}

function resolveGroup(value: string | number | undefined): string {
  const group = statusGroupSchema.safeParse(value);
  if (!group.success) {
    throw invalid(`in_group needs one of ${statusGroupSchema.options.join(', ')}`);
  }
  return group.data;
}

function resolveValue(
  property: DatabaseProperty,
  filter: NamedFilter,
): string | number | undefined {
  if (filter.operator === 'in_group') return resolveGroup(filter.value);
  if (
    hasOptions(property.type) &&
    optionOperators.has(filter.operator) &&
    filter.value !== undefined
  ) {
    return resolveOptionId(property, filter.value);
  }
  return filter.value;
}

export function resolveFilters(
  database: DatabaseDetail,
  filters: readonly NamedFilter[] = [],
): ViewFilter[] {
  return filters.map((filter) => {
    const property = resolveProperty(database, filter.property);
    const value = resolveValue(property, filter);
    return {
      propertyId: property.id,
      operator: filter.operator,
      ...(value === undefined ? {} : { value }),
    };
  });
}

export function resolveSorts(
  database: DatabaseDetail,
  sorts: readonly NamedSort[] = [],
): ViewSort[] {
  return sorts.map((sort) => ({
    propertyId: resolveProperty(database, sort.property).id,
    direction: sort.direction,
  }));
}

function displayValue(property: DatabaseProperty, row: DatabaseRow): PropertyValue {
  if (property.type === 'title') return row.title;
  const value = row.properties[property.id] ?? null;
  if (property.type === 'multi_select') {
    return property.options
      .filter((option) => optionIdsOf(value).includes(option.id))
      .map((option) => option.name);
  }
  if (property.type !== 'select' && property.type !== 'status') return value;
  return property.options.find((option) => option.id === value)?.name ?? null;
}

export interface NamedRow {
  id: string;
  values: Record<string, PropertyValue>;
}

/** Rows keyed by property name with option names instead of ids. */
export function toNamedRows(
  properties: readonly DatabaseProperty[],
  rows: readonly DatabaseRow[],
): NamedRow[] {
  return rows.map((row) => ({
    id: row.id,
    values: Object.fromEntries(
      properties.map((property) => [property.name, displayValue(property, row)]),
    ),
  }));
}
