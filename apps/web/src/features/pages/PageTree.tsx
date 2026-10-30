import type { MovePageInput, PageTreeNode } from '@notiz/shared';
import { type DragEvent, type ReactElement, useMemo, useState } from 'react';
import { type DropPosition, canDrop, dropPositionAt, parentMap, toMoveInput } from './dropTarget';
import { useCoarsePointer } from '../../lib/useMediaQuery';
import styles from './PageTree.module.css';
import { type PageTreeHandlers, PageTreeItem } from './PageTreeItem';

interface PageTreeProps {
  nodes: PageTreeNode[];
  activeId: string | undefined;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onTrash: (id: string) => void;
  onMove: (id: string, input: MovePageInput) => void;
}

/** Sidebar page tree with native HTML5 drag-and-drop for reorder and nesting. */
export function PageTree({ nodes, onMove, ...rest }: PageTreeProps): ReactElement {
  const [draggedId, setDraggedId] = useState<string>();
  const [dropHint, setDropHint] = useState<{ id: string; position: DropPosition }>();
  const parents = useMemo(() => parentMap(nodes), [nodes]);

  const positionFor = (node: PageTreeNode, event: DragEvent<HTMLElement>): DropPosition | null => {
    if (draggedId === undefined || !canDrop(parents, draggedId, node.id)) {
      return null;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    return dropPositionAt(event.clientY - rect.top, rect.height);
  };

  const resetDrag = (): void => {
    setDraggedId(undefined);
    setDropHint(undefined);
  };

  // Touch screens scroll the sidebar instead; native drag-and-drop would fight with that.
  const draggable = !useCoarsePointer();
  const handlers: PageTreeHandlers = {
    ...rest,
    draggable,
    dropHint,
    onDragStart: setDraggedId,
    onDragOver: (node, event) => {
      const position = positionFor(node, event);
      if (position === null) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dropHint?.id !== node.id || dropHint.position !== position) {
        setDropHint({ id: node.id, position });
      }
    },
    onDrop: (node, event) => {
      const position = positionFor(node, event);
      if (draggedId !== undefined && position !== null) {
        event.preventDefault();
        onMove(draggedId, toMoveInput(node, position));
      }
      resetDrag();
    },
    onDragEnd: resetDrag,
  };

  const clearHintWhenLeaving = (event: DragEvent<HTMLElement>): void => {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setDropHint(undefined);
    }
  };

  return (
    <ul className={styles.list} onDragLeave={clearHintWhenLeaving}>
      {nodes.map((node) => (
        <PageTreeItem key={node.id} node={node} depth={0} handlers={handlers} />
      ))}
    </ul>
  );
}
