import type { DatabaseProperty, DatabaseRow, PropertyValues } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { groupRows, planBoardDrop } from './boardDrop';

const status: DatabaseProperty = {
  id: 'status',
  databaseId: 'db',
  name: 'Status',
  type: 'status',
  sortOrder: 'a1',
  options: [
    { id: 'todo', name: 'To do', color: 'gray', group: 'todo' },
    { id: 'done', name: 'Done', color: 'green', group: 'complete' },
  ],
};

function row(id: string, value?: string): DatabaseRow {
  const properties: PropertyValues = value === undefined ? {} : { status: value };
  return { id, title: id, icon: null, sortOrder: id, properties, createdAt: '', updatedAt: '' };
}

const groups = groupRows(
  [row('a', 'todo'), row('b', 'todo'), row('c', 'done'), row('d'), row('e', 'gone')],
  status,
);

describe('groupRows', () => {
  it('puts empty and unknown values in the leading "No value" group', () => {
    expect(groups.map((g) => [g.optionId, g.rows.map((r) => r.id)])).toEqual([
      [null, ['d', 'e']],
      ['todo', ['a', 'b']],
      ['done', ['c']],
    ]);
  });
});

describe('planBoardDrop', () => {
  it('changes the value and places the card before the target card', () => {
    expect(planBoardDrop(groups, 'c', 'todo', 'b', true)).toEqual({
      value: 'todo',
      position: { beforeId: 'b' },
    });
  });

  it('places a card dropped at the end after the last card', () => {
    expect(planBoardDrop(groups, 'a', 'todo', null, true)).toEqual({
      position: { afterId: 'b' },
    });
    expect(planBoardDrop(groups, 'a', null, null, true)).toEqual({
      value: null,
      position: { afterId: 'e' },
    });
  });

  it('returns null when the card stays where it is', () => {
    expect(planBoardDrop(groups, 'a', 'todo', 'b', true)).toBeNull();
    expect(planBoardDrop(groups, 'b', 'todo', null, true)).toBeNull();
    expect(planBoardDrop(groups, 'a', 'todo', 'a', true)).toBeNull();
  });

  it('only changes the value when the view is sorted', () => {
    expect(planBoardDrop(groups, 'a', 'done', 'c', false)).toEqual({ value: 'done' });
    expect(planBoardDrop(groups, 'a', 'todo', null, false)).toBeNull();
  });
});
