import { describe, expect, it } from 'vitest';
import type { PropertyOption } from './databases.js';
import {
  convertPropertyValue,
  isDateValue,
  isEmptyValue,
  isValidPropertyValue,
  valueToText,
} from './propertyValues.js';

const options: PropertyOption[] = [
  { id: 'o1', name: 'Open', color: 'gray', group: 'todo' },
  { id: 'o2', name: 'Done', color: 'green', group: 'complete' },
];
const status = { type: 'status' as const, options };
const text = { type: 'text' as const, options: [] };

describe('isDateValue', () => {
  it('accepts real days only', () => {
    expect(isDateValue('2026-02-28')).toBe(true);
    expect(isDateValue('2026-02-30')).toBe(false);
    expect(isDateValue('2026-2-3')).toBe(false);
  });
});

describe('isValidPropertyValue', () => {
  it('checks the value type per property type', () => {
    expect(isValidPropertyValue({ type: 'number', options: [] }, 3.5)).toBe(true);
    expect(isValidPropertyValue({ type: 'number', options: [] }, '3')).toBe(false);
    expect(isValidPropertyValue({ type: 'checkbox', options: [] }, true)).toBe(true);
    expect(isValidPropertyValue({ type: 'date', options: [] }, '2026-10-26')).toBe(true);
    expect(isValidPropertyValue(text, 'x'.repeat(10_001))).toBe(false);
  });

  it('accepts only existing option ids for select and status', () => {
    expect(isValidPropertyValue(status, 'o1')).toBe(true);
    expect(isValidPropertyValue(status, 'Open')).toBe(false);
  });

  it('always accepts null to clear a value', () => {
    expect(isValidPropertyValue(status, null)).toBe(true);
  });
});

describe('convertPropertyValue', () => {
  it('turns options into their names and back', () => {
    expect(convertPropertyValue('o2', status, text)).toBe('Done');
    expect(convertPropertyValue('done', text, status)).toBe('o2');
    expect(convertPropertyValue('Later', text, status)).toBeNull();
  });

  it('keeps option ids between select and status', () => {
    expect(convertPropertyValue('o1', status, { type: 'select', options })).toBe('o1');
  });

  it('parses numbers and dates from text and drops what does not fit', () => {
    expect(convertPropertyValue(' 42 ', text, { type: 'number', options: [] })).toBe(42);
    expect(convertPropertyValue('abc', text, { type: 'number', options: [] })).toBeNull();
    expect(convertPropertyValue('2026-01-05', text, { type: 'date', options: [] })).toBe(
      '2026-01-05',
    );
    expect(convertPropertyValue('yes', text, { type: 'checkbox', options: [] })).toBeNull();
    expect(convertPropertyValue(7, { type: 'number', options: [] }, text)).toBe('7');
  });
});

describe('multi_select values', () => {
  const tags = { type: 'multi_select' as const, options };

  it('accepts lists of distinct existing option ids', () => {
    expect(isValidPropertyValue(tags, ['o1', 'o2'])).toBe(true);
    expect(isValidPropertyValue(tags, ['o1', 'o1'])).toBe(false);
    expect(isValidPropertyValue(tags, ['nope'])).toBe(false);
    expect(isValidPropertyValue(tags, 'o1')).toBe(false);
    expect(isValidPropertyValue(status, ['o1'])).toBe(false);
  });

  it('treats an empty list as empty and writes names joined by commas', () => {
    expect(isEmptyValue([])).toBe(true);
    expect(valueToText(tags, ['o2', 'o1'])).toBe('Done, Open');
  });

  it('converts to and from select, status and text', () => {
    expect(convertPropertyValue('o1', status, tags)).toEqual(['o1']);
    expect(convertPropertyValue(['o2', 'o1'], tags, status)).toBe('o2');
    expect(convertPropertyValue(['o1', 'o2'], tags, text)).toBe('Open, Done');
    expect(convertPropertyValue('done, open, later', text, tags)).toEqual(['o2', 'o1']);
    expect(convertPropertyValue('later', text, tags)).toBeNull();
    expect(
      convertPropertyValue(['o1', 'o2'], tags, {
        type: 'multi_select',
        options: [options[1] as PropertyOption],
      }),
    ).toEqual(['o2']);
  });

  it('matches options by name when the ids are not kept', () => {
    const other: PropertyOption[] = [{ id: 'x', name: 'open', color: 'red' }];
    expect(convertPropertyValue(['o1'], tags, { type: 'select', options: other })).toBe('x');
  });
});

describe('relation values', () => {
  const relation = { type: 'relation' as const, options: [] };
  const rowA = '00000000-0000-4000-8000-00000000000a';
  const rowB = '00000000-0000-4000-8000-00000000000b';

  it('accepts unique row ids only', () => {
    expect(isValidPropertyValue(relation, [rowA, rowB])).toBe(true);
    expect(isValidPropertyValue(relation, [])).toBe(true);
    expect(isValidPropertyValue(relation, [rowA, rowA])).toBe(false);
    expect(isValidPropertyValue(relation, ['not-a-row'])).toBe(false);
    expect(isValidPropertyValue(relation, rowA)).toBe(false);
  });

  it('has no plain text and clears on type changes in either direction', () => {
    expect(valueToText(relation, [rowA])).toBe('');
    expect(convertPropertyValue([rowA], relation, { type: 'text', options: [] })).toBeNull();
    expect(convertPropertyValue('Open', { type: 'text', options: [] }, relation)).toBeNull();
    expect(convertPropertyValue([rowA], relation, relation)).toEqual([rowA]);
  });
});
