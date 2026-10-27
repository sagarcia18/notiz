import {
  type DatabaseProperty,
  type DatabaseRow,
  NO_VALUE_KEY,
  type OptionColor,
  type StatusGroup,
  type WidgetConfig,
  type WidgetData,
  type WidgetMetric,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import * as databasesRepo from '../repositories/databases.repository.js';
import * as pagesRepo from '../repositories/pages.repository.js';
import { parseConfig } from './databaseJson.js';
import { listDatabaseProperties } from './databases.service.js';
import { filterRows } from './rowQuery.js';
import { listRows } from './rows.service.js';

type PropertyMap = ReadonlyMap<string, DatabaseProperty>;

interface WidgetSource {
  rows: DatabaseRow[];
  properties: PropertyMap;
}

interface BucketSpec {
  key: string;
  label: string;
  color: OptionColor | null;
}

const statusGroups: { key: StatusGroup; label: string; color: OptionColor }[] = [
  { key: 'todo', label: 'To-do', color: 'gray' },
  { key: 'in_progress', label: 'In progress', color: 'blue' },
  { key: 'complete', label: 'Complete', color: 'green' },
];

const groupableTypes = new Set(['select', 'status']);

function emptyData(state: WidgetData['state']): WidgetData {
  return { state, total: null, buckets: [] };
}

function numbersOf(rows: DatabaseRow[], property: DatabaseProperty | null): number[] {
  if (property === null) {
    return [];
  }
  return rows
    .map((row) => row.properties[property.id])
    .filter((value): value is number => typeof value === 'number');
}

function metricOf(
  rows: DatabaseRow[],
  metric: WidgetMetric,
  property: DatabaseProperty | null,
): number | null {
  if (metric === 'count') {
    return rows.length;
  }
  const numbers = numbersOf(rows, property);
  const sum = numbers.reduce((total, value) => total + value, 0);
  if (metric === 'sum') {
    return sum;
  }
  return numbers.length === 0 ? null : sum / numbers.length;
}

function bucketSpecs(property: DatabaseProperty, byStatusGroup: boolean): BucketSpec[] {
  if (byStatusGroup) {
    return [...statusGroups];
  }
  return property.options.map((option) => ({
    key: option.id,
    label: option.name,
    color: option.color,
  }));
}

function bucketKeyOf(row: DatabaseRow, property: DatabaseProperty, byStatusGroup: boolean): string {
  const value = row.properties[property.id];
  const option = property.options.find((candidate) => candidate.id === value);
  if (option === undefined) {
    return NO_VALUE_KEY;
  }
  return byStatusGroup ? (option.group ?? NO_VALUE_KEY) : option.id;
}

function groupRows(
  rows: DatabaseRow[],
  property: DatabaseProperty,
  byStatusGroup: boolean,
): Map<string, DatabaseRow[]> {
  const groups = new Map<string, DatabaseRow[]>();
  for (const row of rows) {
    const key = bucketKeyOf(row, property, byStatusGroup);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

/** The property the metric reads, null for count; undefined when it does not fit. */
function metricProperty(
  config: WidgetConfig,
  properties: PropertyMap,
): DatabaseProperty | null | undefined {
  if (config.metric === 'count') {
    return null;
  }
  const property = properties.get(config.metricPropertyId ?? '');
  return property?.type === 'number' ? property : undefined;
}

function groupProperty(
  config: WidgetConfig,
  properties: PropertyMap,
): DatabaseProperty | undefined {
  const property = properties.get(config.groupByPropertyId ?? '');
  if (property === undefined || !groupableTypes.has(property.type)) {
    return undefined;
  }
  if (config.groupByStatusGroup && property.type !== 'status') {
    return undefined;
  }
  return property;
}

/** Pure aggregation of already filtered rows; the only place dashboard numbers are computed. */
export function aggregateRows(
  rows: DatabaseRow[],
  properties: PropertyMap,
  config: WidgetConfig,
): WidgetData {
  const valueProperty = metricProperty(config, properties);
  if (valueProperty === undefined) {
    return emptyData('source_missing');
  }
  const total = metricOf(rows, config.metric, valueProperty);
  if (config.type === 'kpi') {
    return { state: 'ok', total, buckets: [] };
  }
  if (config.groupByPropertyId === null) {
    return emptyData('unconfigured');
  }
  const property = groupProperty(config, properties);
  if (property === undefined) {
    return emptyData('source_missing');
  }
  const groups = groupRows(rows, property, config.groupByStatusGroup);
  const specs = bucketSpecs(property, config.groupByStatusGroup);
  if (groups.has(NO_VALUE_KEY)) {
    specs.push({ key: NO_VALUE_KEY, label: 'No value', color: null });
  }
  const buckets = specs.map((spec) => ({
    ...spec,
    value: metricOf(groups.get(spec.key) ?? [], config.metric, valueProperty),
  }));
  return { state: 'ok', total, buckets };
}

/** Rows of the configured database, narrowed by the view's filters; null when a source is gone. */
function resolveSource(
  db: AppDatabase,
  databaseId: string,
  viewId: string | null,
): WidgetSource | null {
  const database = pagesRepo.findPage(db, databaseId);
  if (!database || database.deletedAt !== null || database.kind !== 'database') {
    return null;
  }
  const properties = new Map(
    listDatabaseProperties(db, databaseId).map((property) => [property.id, property]),
  );
  const rows = listRows(db, databaseId);
  if (viewId === null) {
    return { rows, properties };
  }
  const view = databasesRepo.findView(db, viewId);
  if (!view || view.databaseId !== databaseId) {
    return null;
  }
  return { rows: filterRows(rows, properties, parseConfig(view.configJson).filters), properties };
}

export function computeWidgetData(db: AppDatabase, config: WidgetConfig): WidgetData {
  if (config.databaseId === null) {
    return emptyData('unconfigured');
  }
  const source = resolveSource(db, config.databaseId, config.viewId);
  if (source === null) {
    return emptyData('source_missing');
  }
  return aggregateRows(source.rows, source.properties, config);
}
