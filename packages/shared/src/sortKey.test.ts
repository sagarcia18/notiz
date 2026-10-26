import { describe, expect, it } from 'vitest';
import { sortKeyBetween } from './sortKey.js';

describe('sortKeyBetween', () => {
  it('creates a first key without neighbours', () => {
    expect(sortKeyBetween(null, null)).toBe('V');
  });

  it('places keys before, after and between neighbours', () => {
    const middle = sortKeyBetween(null, null);
    const after = sortKeyBetween(middle, null);
    const before = sortKeyBetween(null, middle);
    const between = sortKeyBetween(middle, after);
    expect([after, between, before, middle].sort()).toEqual([before, middle, between, after]);
  });

  it('keeps finding room between adjacent keys', () => {
    let low = 'a';
    const high = 'b';
    for (let i = 0; i < 50; i++) {
      const next = sortKeyBetween(low, high);
      expect(next > low && next < high).toBe(true);
      low = next;
    }
  });

  it('keeps finding room when always inserting first', () => {
    let high = sortKeyBetween(null, null);
    for (let i = 0; i < 50; i++) {
      const next = sortKeyBetween(null, high);
      expect(next < high).toBe(true);
      expect(next.endsWith('0')).toBe(false);
      high = next;
    }
  });

  it('keeps appending in order', () => {
    const keys: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 200; i++) {
      last = sortKeyBetween(last, null);
      keys.push(last);
    }
    expect([...keys].sort()).toEqual(keys);
  });

  it('rejects invalid input', () => {
    expect(() => sortKeyBetween('b', 'a')).toThrow();
    expect(() => sortKeyBetween('a0', null)).toThrow();
    expect(() => sortKeyBetween('a-', null)).toThrow();
  });
});
