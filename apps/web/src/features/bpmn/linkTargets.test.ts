import type { PageTreeNode } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { filterTargets, flattenTargets, targetLabel } from './linkTargets';

function node(id: string, title: string, children: PageTreeNode[] = []): PageTreeNode {
  return { id, parentId: null, kind: 'doc', title, icon: null, sortOrder: 'a0', children };
}

describe('flattenTargets', () => {
  it('lists pages depth-first without the diagram itself', () => {
    const tree = [node('a', 'A', [node('a1', 'A1'), node('self', 'Diagram')]), node('b', 'B')];
    expect(flattenTargets(tree, 'self').map((target) => target.id)).toEqual(['a', 'a1', 'b']);
  });
});

describe('filterTargets', () => {
  const targets = [{ title: 'Detección de humo' }, { title: 'Layout' }];

  it('matches ignoring case and accents', () => {
    expect(filterTargets(targets, 'DETECCION')).toEqual([{ title: 'Detección de humo' }]);
  });

  it('returns everything for an empty query', () => {
    expect(filterTargets(targets, '  ')).toEqual(targets);
  });
});

describe('targetLabel', () => {
  it('names untitled pages', () => {
    expect(targetLabel({ title: ' ' })).toBe('Untitled');
  });
});
