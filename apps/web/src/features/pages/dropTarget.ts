import type { MovePageInput, PageTreeNode } from '@notiz/shared';

export type DropPosition = 'before' | 'inside' | 'after';

/** Top and bottom quarter of a row reorder; the middle nests the page. */
export function dropPositionAt(offsetY: number, rowHeight: number): DropPosition {
  if (offsetY < rowHeight / 4) {
    return 'before';
  }
  if (offsetY > (rowHeight * 3) / 4) {
    return 'after';
  }
  return 'inside';
}

export function toMoveInput(target: PageTreeNode, position: DropPosition): MovePageInput {
  switch (position) {
    case 'inside':
      return { parentId: target.id };
    case 'before':
      return { parentId: target.parentId, beforeId: target.id };
    case 'after':
      return { parentId: target.parentId, afterId: target.id };
  }
}

/** Maps every page id to its parent id, for ancestor checks while dragging. */
export function parentMap(nodes: PageTreeNode[]): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  const visit = (list: PageTreeNode[]): void => {
    for (const node of list) {
      parents.set(node.id, node.parentId);
      visit(node.children);
    }
  };
  visit(nodes);
  return parents;
}

/** A page may not be dropped on itself or anywhere inside its own subtree. */
export function canDrop(
  parents: Map<string, string | null>,
  draggedId: string,
  targetId: string,
): boolean {
  let current: string | null | undefined = targetId;
  while (current !== null && current !== undefined) {
    if (current === draggedId) {
      return false;
    }
    current = parents.get(current);
  }
  return true;
}
