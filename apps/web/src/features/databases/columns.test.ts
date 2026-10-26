import type { DatabaseProperty, PropertyType } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { moveColumn, tableColumns, updateColumn } from './columns';

function property(id: string, type: PropertyType = 'text'): DatabaseProperty {
  return { id, databaseId: 'db', name: id, type, options: [], sortOrder: id };
}

const properties = [property('a'), property('name', 'title'), property('b'), property('c')];
const ids = (list: { property: DatabaseProperty }[]): string[] => list.map((c) => c.property.id);

describe('tableColumns', () => {
  it('puts the title first, then configured columns, then the rest', () => {
    const columns = tableColumns(properties, [
      { propertyId: 'c', width: 300 },
      { propertyId: 'a' },
    ]);
    expect(ids(columns)).toEqual(['name', 'c', 'a', 'b']);
    expect(columns[1]?.width).toBe(300);
  });

  it('never hides the title', () => {
    const columns = tableColumns(properties, [{ propertyId: 'name', hidden: true }]);
    expect(columns[0]?.hidden).toBe(false);
  });
});

describe('column config changes', () => {
  const columns = tableColumns(properties, []);

  it('writes the full order with only non-default settings', () => {
    expect(updateColumn(columns, 'b', { hidden: true })).toEqual([
      { propertyId: 'name' },
      { propertyId: 'a' },
      { propertyId: 'b', hidden: true },
      { propertyId: 'c' },
    ]);
  });

  it('moves columns but keeps the title first', () => {
    expect(moveColumn(columns, 'c', -1).map((c) => c.propertyId)).toEqual(['name', 'a', 'c', 'b']);
    expect(moveColumn(columns, 'a', -1).map((c) => c.propertyId)).toEqual(['name', 'a', 'b', 'c']);
  });
});

describe('moveColumn with hidden columns', () => {
  it('skips hidden columns', () => {
    const columns = tableColumns(properties, [{ propertyId: 'b', hidden: true }]);
    expect(moveColumn(columns, 'a', 1).map((c) => c.propertyId)).toEqual(['name', 'b', 'c', 'a']);
  });
});
