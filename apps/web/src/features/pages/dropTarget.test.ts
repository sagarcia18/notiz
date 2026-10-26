import type { PageTreeNode } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { canDrop, dropPositionAt, parentMap, toMoveInput } from './dropTarget';

function node(id: string, parentId: string | null, children: PageTreeNode[] = []): PageTreeNode {
  return { id, parentId, kind: 'doc', title: id, icon: null, sortOrder: 'V', children };
}

const tree = [node('a', null, [node('b', 'a', [node('c', 'b')])]), node('d', null)];

describe('dropPositionAt', () => {
  it('splits a row into before, inside and after zones', () => {
    expect(dropPositionAt(2, 28)).toBe('before');
    expect(dropPositionAt(14, 28)).toBe('inside');
    expect(dropPositionAt(26, 28)).toBe('after');
  });
});

describe('toMoveInput', () => {
  const target = node('b', 'a');

  it('nests inside the target', () => {
    expect(toMoveInput(target, 'inside')).toEqual({ parentId: 'b' });
  });

  it('places before or after the target among its siblings', () => {
    expect(toMoveInput(target, 'before')).toEqual({ parentId: 'a', beforeId: 'b' });
    expect(toMoveInput(target, 'after')).toEqual({ parentId: 'a', afterId: 'b' });
  });
});

describe('canDrop', () => {
  const parents = parentMap(tree);

  it('forbids dropping a page on itself or its descendants', () => {
    expect(canDrop(parents, 'a', 'a')).toBe(false);
    expect(canDrop(parents, 'a', 'c')).toBe(false);
  });

  it('allows dropping on unrelated pages and ancestors', () => {
    expect(canDrop(parents, 'c', 'a')).toBe(true);
    expect(canDrop(parents, 'a', 'd')).toBe(true);
  });
});
