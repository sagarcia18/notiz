import type { DatabaseRow } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { rowLabel, searchRows, toggleRelation } from './relationValues';

function row(id: string, title: string): DatabaseRow {
  return { id, title, icon: null, sortOrder: id, properties: {}, createdAt: '', updatedAt: '' };
}

const rows = [row('a', 'Détecteur'), row('b', 'Horn'), row('c', '')];

describe('relation values', () => {
  it('adds and removes rows and clears when none are left', () => {
    expect(toggleRelation(rows, [], 'b')).toEqual(['b']);
    expect(toggleRelation(rows, ['b'], 'a')).toEqual(['b', 'a']);
    expect(toggleRelation(rows, ['b'], 'b')).toBeNull();
  });

  it('drops ids of rows that are no longer listed', () => {
    expect(toggleRelation(rows, ['gone', 'b'], 'a')).toEqual(['b', 'a']);
  });

  it('searches titles ignoring case and accents', () => {
    expect(searchRows(rows, 'detect').map((r) => r.id)).toEqual(['a']);
    expect(searchRows(rows, '  ').map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(searchRows(rows, 'untitled').map((r) => r.id)).toEqual(['c']);
    expect(rowLabel(rows[2] ?? row('x', ''))).toBe('Untitled');
  });
});
