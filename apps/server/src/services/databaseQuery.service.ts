import {
  type DatabaseAggregate,
  type DatabaseAggregateResult,
  type DatabaseProperty,
  type DatabaseQuery,
  type DatabaseQueryResult,
  type DatabaseRow,
  type ViewFilter,
  type ViewSort,
  operatorNeedsValue,
  operatorsByType,
  widgetConfigSchema,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import { aggregateRows } from './aggregation.service.js';
import { listDatabaseProperties, requireDatabase } from './databases.service.js';
import { filterRows, sortRows } from './rowQuery.js';
import { listRows } from './rows.service.js';

type PropertyMap = ReadonlyMap<string, DatabaseProperty>;

function loadProperties(db: AppDatabase, databaseId: string): PropertyMap {
  requireDatabase(db, databaseId);
  return new Map(listDatabaseProperties(db, databaseId).map((property) => [property.id, property]));
}

function requireProperty(properties: PropertyMap, id: string): DatabaseProperty {
  const property = properties.get(id);
  if (!property) throw new ValidationError(`Property ${id} is not part of this database`);
  return property;
}

/** Unlike saved views, a query that would silently ignore a filter is an error. */
function checkFilters(properties: PropertyMap, filters: readonly ViewFilter[]): void {
  for (const filter of filters) {
    const property = requireProperty(properties, filter.propertyId);
    const allowed = operatorsByType[property.type];
    if (!allowed.includes(filter.operator)) {
      throw new ValidationError(
        `Operator ${filter.operator} does not fit ${property.type} property "${property.name}"; ` +
          `use one of ${allowed.join(', ')}`,
      );
    }
    if (operatorNeedsValue(filter.operator) && filter.value === undefined) {
      throw new ValidationError(`Operator ${filter.operator} needs a value`);
    }
  }
}

function checkSorts(properties: PropertyMap, sorts: readonly ViewSort[]): void {
  for (const sort of sorts) requireProperty(properties, sort.propertyId);
}

function filteredRows(
  db: AppDatabase,
  databaseId: string,
  properties: PropertyMap,
  filters: ViewFilter[],
): DatabaseRow[] {
  checkFilters(properties, filters);
  return filterRows(listRows(db, databaseId), properties, filters);
}

export function queryDatabase(
  db: AppDatabase,
  databaseId: string,
  { filters, sorts, limit, offset }: DatabaseQuery,
): DatabaseQueryResult {
  const properties = loadProperties(db, databaseId);
  checkSorts(properties, sorts);
  const rows = sortRows(filteredRows(db, databaseId, properties, filters), properties, sorts);
  return { total: rows.length, rows: rows.slice(offset, offset + limit) };
}

function checkAggregate(properties: PropertyMap, input: DatabaseAggregate): void {
  if (input.metric !== 'count') {
    if (input.metricPropertyId === null) {
      throw new ValidationError(`Metric ${input.metric} needs a number property`);
    }
    const property = requireProperty(properties, input.metricPropertyId);
    if (property.type !== 'number') {
      throw new ValidationError(`Property "${property.name}" is not a number property`);
    }
  }
  if (input.groupByPropertyId !== null) {
    const group = requireProperty(properties, input.groupByPropertyId);
    if (group.type !== 'select' && group.type !== 'status') {
      throw new ValidationError(`Group by needs a select or status property, not ${group.type}`);
    }
    if (input.groupByStatusGroup && group.type !== 'status') {
      throw new ValidationError('Grouping by status group needs a status property');
    }
  } else if (input.groupByStatusGroup) {
    throw new ValidationError('groupByStatusGroup needs groupByPropertyId');
  }
}

/** Ad-hoc numbers through the same aggregation as dashboard widgets. */
export function aggregateDatabase(
  db: AppDatabase,
  databaseId: string,
  parsed: DatabaseAggregate,
): DatabaseAggregateResult {
  const properties = loadProperties(db, databaseId);
  checkAggregate(properties, parsed);
  const rows = filteredRows(db, databaseId, properties, parsed.filters);
  const config = widgetConfigSchema.parse({
    type: parsed.groupByPropertyId === null ? 'kpi' : 'bar',
    databaseId,
    metric: parsed.metric,
    metricPropertyId: parsed.metricPropertyId,
    groupByPropertyId: parsed.groupByPropertyId,
    groupByStatusGroup: parsed.groupByStatusGroup,
  });
  const { total, buckets } = aggregateRows(rows, properties, config);
  return { total, buckets };
}
