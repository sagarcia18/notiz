import { describe, expect, it } from 'vitest';
import {
  cellToValue,
  guessStatusGroup,
  inferColumn,
  parseNotionDate,
  parseNotionNumber,
} from '../src/import/propertyInference.js';

const typeOf = (name: string, values: string[]): string => inferColumn(name, values).type;

describe('inferColumn', () => {
  it('detects checkbox, number, date and url columns', () => {
    expect(typeOf('Done', ['Yes', 'No', ''])).toBe('checkbox');
    expect(typeOf('Points', ['3', '1,200', '-2.5'])).toBe('number');
    expect(typeOf('Due', ['October 27, 2026', '2026/01/05', 'Jan 3, 2026 → Jan 5, 2026'])).toBe(
      'date',
    );
    expect(typeOf('Link', ['https://a.org', 'http://b.org/x'])).toBe('url');
  });

  it('makes a Status column a status with guessed groups', () => {
    const status = inferColumn('Status', ['Done', 'In progress', 'Not started', 'Done']);
    expect(status.type).toBe('status');
    expect(status.options.map((option) => [option.name, option.group])).toEqual([
      ['Not started', 'todo'],
      ['In progress', 'in_progress'],
      ['Done', 'complete'],
    ]);
  });

  it('tells select, multi-select and text apart', () => {
    expect(typeOf('Priority', ['High', 'Low', 'High'])).toBe('select');
    const tags = inferColumn('Tags', ['a, b', 'b', 'c, a']);
    expect(tags.type).toBe('multi_select');
    expect(tags.options.map((option) => option.name)).toEqual(['a', 'b', 'c']);
    expect(typeOf('Notes', ['First note', 'Second note'])).toBe('text');
    expect(typeOf('Notes', ['Hello, world', 'Bye, then'])).toBe('text');
    expect(typeOf('Empty', ['', ''])).toBe('text');
  });

  it('skips person columns and imports relations as text, with a note', () => {
    expect(inferColumn('Assignee', ['Ana'])).toMatchObject({
      type: 'skip',
      note: 'Skipped person property "Assignee"',
    });
    const relation = inferColumn('Project', [`Website (Projects/Website ${'a'.repeat(32)}.md)`]);
    expect(relation.type).toBe('text');
    expect(relation.note).toContain('Relation');
  });
});

describe('cell values', () => {
  const ids = new Map([
    ['a', 'id-a'],
    ['b', 'id-b'],
  ]);

  it('converts cells to stored values', () => {
    expect(cellToValue('number', '1,200', ids)).toBe(1200);
    expect(cellToValue('checkbox', 'No', ids)).toBe(false);
    expect(cellToValue('date', 'March 2, 2026 4:00 PM', ids)).toBe('2026-03-02');
    expect(cellToValue('select', 'a', ids)).toBe('id-a');
    expect(cellToValue('multi_select', 'b, a, b, x', ids)).toEqual(['id-b', 'id-a']);
    expect(cellToValue('text', 'Site (Web abc.md), Blog (Blog abc.md)', ids)).toBe('Site, Blog');
    expect(cellToValue('text', '  ', ids)).toBeNull();
  });

  it('parses dates and numbers strictly', () => {
    expect(parseNotionDate('February 30, 2026')).toBeNull();
    expect(parseNotionDate('10/27/2026')).toBe('2026-10-27');
    expect(parseNotionNumber('12 apples')).toBeNull();
    expect(parseNotionNumber('$1,000.50')).toBe(1000.5);
  });

  it('guesses status groups from option names', () => {
    expect(guessStatusGroup('Completed')).toBe('complete');
    expect(guessStatusGroup('Not started')).toBe('todo');
    expect(guessStatusGroup('In review')).toBe('in_progress');
    expect(guessStatusGroup('Someday')).toBe('todo');
  });
});
