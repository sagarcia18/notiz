import type { DatabaseProperty, DatabaseRow, PropertyType, PropertyValues } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { filterRows, sortRows } from '../src/services/rowQuery.js';

function property(id: string, type: PropertyType): DatabaseProperty {
  const options =
    type === 'status'
      ? [
          { id: 'todo', name: 'To do', color: 'gray' as const, group: 'todo' as const },
          { id: 'doing', name: 'Doing', color: 'blue' as const, group: 'in_progress' as const },
          { id: 'done', name: 'Done', color: 'green' as const, group: 'complete' as const },
        ]
      : [];
  return {
    id,
    databaseId: 'db',
    name: id,
    type,
    options,
    relationDatabaseId: null,
    sortOrder: 'a0',
  };
}

const props = new Map(
  [
    property('name', 'title'),
    property('status', 'status'),
    property('due', 'date'),
    property('done', 'checkbox'),
  ].map((p) => [p.id, p]),
);

function row(title: string, sortOrder: string, properties: PropertyValues = {}): DatabaseRow {
  return { id: title, title, icon: null, sortOrder, properties, createdAt: '', updatedAt: '' };
}

const rows = [
  row('Alpha', 'a1', { status: 'done', due: '2026-03-01', done: true }),
  row('beta', 'a2', { status: 'todo', due: '2026-01-15' }),
  row('Gamma', 'a3', { status: 'doing' }),
];
const names = (list: DatabaseRow[]): string[] => list.map((r) => r.title);

describe('filterRows', () => {
  it('matches text case-insensitively', () => {
    expect(
      names(filterRows(rows, props, [{ propertyId: 'name', operator: 'contains', value: 'A' }])),
    ).toEqual(['Alpha', 'beta', 'Gamma']);
    expect(
      names(filterRows(rows, props, [{ propertyId: 'name', operator: 'equals', value: 'BETA' }])),
    ).toEqual(['beta']);
  });

  it('compares dates and treats empty values as not matching', () => {
    const filters = [{ propertyId: 'due', operator: 'lt' as const, value: '2026-02-01' }];
    expect(names(filterRows(rows, props, filters))).toEqual(['beta']);
  });

  it('filters status by group and checkboxes', () => {
    expect(
      names(
        filterRows(rows, props, [
          { propertyId: 'status', operator: 'in_group', value: 'in_progress' },
        ]),
      ),
    ).toEqual(['Gamma']);
    expect(
      names(filterRows(rows, props, [{ propertyId: 'done', operator: 'is_not_checked' }])),
    ).toEqual(['beta', 'Gamma']);
  });

  it('combines filters with AND and skips filters that do not fit', () => {
    const filters = [
      { propertyId: 'due', operator: 'is_not_empty' as const },
      { propertyId: 'status', operator: 'not_equals' as const, value: 'done' },
      { propertyId: 'done', operator: 'contains' as const, value: 'x' },
      { propertyId: crypto.randomUUID(), operator: 'is_empty' as const },
    ];
    expect(names(filterRows(rows, props, filters))).toEqual(['beta']);
  });
});

describe('sortRows', () => {
  it('sorts status by option order and puts empty values last', () => {
    expect(names(sortRows(rows, props, [{ propertyId: 'status', direction: 'desc' }]))).toEqual([
      'Alpha',
      'Gamma',
      'beta',
    ]);
    expect(names(sortRows(rows, props, [{ propertyId: 'due', direction: 'desc' }]))).toEqual([
      'Alpha',
      'beta',
      'Gamma',
    ]);
    expect(names(sortRows(rows, props, [{ propertyId: 'due', direction: 'asc' }]))).toEqual([
      'beta',
      'Alpha',
      'Gamma',
    ]);
  });

  it('sorts titles case-insensitively and falls back to manual order', () => {
    expect(names(sortRows(rows, props, [{ propertyId: 'name', direction: 'desc' }]))).toEqual([
      'Gamma',
      'beta',
      'Alpha',
    ]);
    expect(names(sortRows([...rows].reverse(), props, []))).toEqual(['Alpha', 'beta', 'Gamma']);
  });
});

describe('multi_select', () => {
  const tags: DatabaseProperty = {
    ...property('tags', 'multi_select'),
    options: [
      { id: 'red', name: 'Red', color: 'red' },
      { id: 'blue', name: 'Blue', color: 'blue' },
    ],
  };
  const tagProps = new Map([[tags.id, tags]]);
  const tagged = [
    row('One', 'a1', { tags: ['blue'] }),
    row('Two', 'a2', { tags: ['red', 'blue'] }),
    row('Three', 'a3', { tags: [] }),
  ];

  it('filters by contained option and emptiness', () => {
    const where = (operator: 'contains' | 'not_contains' | 'is_empty', value?: string): string[] =>
      names(filterRows(tagged, tagProps, [{ propertyId: 'tags', operator, value }]));
    expect(where('contains', 'red')).toEqual(['Two']);
    expect(where('not_contains', 'red')).toEqual(['One', 'Three']);
    expect(where('is_empty')).toEqual(['Three']);
  });

  it('sorts by the first option in option order, empty last', () => {
    expect(names(sortRows(tagged, tagProps, [{ propertyId: 'tags', direction: 'asc' }]))).toEqual([
      'Two',
      'One',
      'Three',
    ]);
  });
});
