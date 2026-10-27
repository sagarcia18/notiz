import {
  type DatabaseProperty,
  type DatabaseRow,
  type PropertyValues,
  NO_VALUE_KEY,
  widgetConfigSchema,
} from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { aggregateRows } from '../src/services/aggregation.service.js';

const databaseId = crypto.randomUUID();
const status: DatabaseProperty = {
  id: crypto.randomUUID(),
  databaseId,
  name: 'Status',
  type: 'status',
  sortOrder: 'a1',
  options: [
    { id: 'todo', name: 'Not started', color: 'gray', group: 'todo' },
    { id: 'doing', name: 'Doing', color: 'blue', group: 'in_progress' },
    { id: 'review', name: 'Review', color: 'purple', group: 'in_progress' },
    { id: 'done', name: 'Done', color: 'green', group: 'complete' },
  ],
};
const points: DatabaseProperty = {
  id: crypto.randomUUID(),
  databaseId,
  name: 'Points',
  type: 'number',
  sortOrder: 'a2',
  options: [],
};
const notes: DatabaseProperty = { ...points, id: crypto.randomUUID(), name: 'Notes', type: 'text' };
const properties = new Map([status, points, notes].map((property) => [property.id, property]));

function row(values: PropertyValues): DatabaseRow {
  return {
    id: crypto.randomUUID(),
    title: '',
    icon: null,
    sortOrder: 'a0',
    properties: values,
    createdAt: '',
    updatedAt: '',
  };
}

const rows = [
  row({ [status.id]: 'todo', [points.id]: 1 }),
  row({ [status.id]: 'doing', [points.id]: 2 }),
  row({ [status.id]: 'review', [points.id]: 3 }),
  row({ [status.id]: 'done' }),
  row({ [status.id]: 'deleted-option', [points.id]: 4 }),
  row({}),
];

const config = (input: object): ReturnType<typeof widgetConfigSchema.parse> =>
  widgetConfigSchema.parse({ databaseId, ...input });

describe('aggregateRows', () => {
  it('counts all rows for a KPI', () => {
    expect(aggregateRows(rows, properties, config({ type: 'kpi' }))).toEqual({
      state: 'ok',
      total: 6,
      buckets: [],
    });
  });

  it('sums and averages number values, ignoring rows without a number', () => {
    const sum = config({ type: 'kpi', metric: 'sum', metricPropertyId: points.id });
    const avg = config({ type: 'kpi', metric: 'avg', metricPropertyId: points.id });
    expect(aggregateRows(rows, properties, sum).total).toBe(10);
    expect(aggregateRows(rows, properties, avg).total).toBe(2.5);
    expect(aggregateRows([], properties, avg).total).toBeNull();
  });

  it('groups by option in option order, with zero buckets and a trailing No value', () => {
    const data = aggregateRows(
      rows,
      properties,
      config({ type: 'bar', groupByPropertyId: status.id }),
    );
    expect(data.buckets.map((b) => [b.key, b.value])).toEqual([
      ['todo', 1],
      ['doing', 1],
      ['review', 1],
      ['done', 1],
      [NO_VALUE_KEY, 2],
    ]);
    expect(data.buckets[0]).toMatchObject({ label: 'Not started', color: 'gray' });
  });

  it('groups a status property by status group', () => {
    const data = aggregateRows(
      rows.slice(0, 4),
      properties,
      config({ type: 'pie', groupByPropertyId: status.id, groupByStatusGroup: true }),
    );
    expect(data.buckets.map((b) => [b.key, b.label, b.value])).toEqual([
      ['todo', 'To-do', 1],
      ['in_progress', 'In progress', 2],
      ['complete', 'Complete', 1],
    ]);
  });

  it('applies sum per group', () => {
    const data = aggregateRows(
      rows,
      properties,
      config({
        type: 'bar',
        metric: 'sum',
        metricPropertyId: points.id,
        groupByPropertyId: status.id,
        groupByStatusGroup: true,
      }),
    );
    expect(data.buckets.map((b) => b.value)).toEqual([1, 5, 0, 4]);
  });

  it('reports charts without grouping as unconfigured', () => {
    expect(aggregateRows(rows, properties, config({ type: 'bar' })).state).toBe('unconfigured');
  });

  it('reports properties that do not fit as source_missing', () => {
    const cases = [
      config({ type: 'kpi', metric: 'sum', metricPropertyId: notes.id }),
      config({ type: 'kpi', metric: 'avg', metricPropertyId: crypto.randomUUID() }),
      config({ type: 'bar', groupByPropertyId: notes.id }),
      config({ type: 'bar', groupByPropertyId: crypto.randomUUID() }),
    ];
    for (const widget of cases) {
      expect(aggregateRows(rows, properties, widget).state).toBe('source_missing');
    }
  });
});
