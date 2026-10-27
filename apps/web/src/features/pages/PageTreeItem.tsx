import type { PageKind, PageTreeNode } from '@notiz/shared';
import type { DragEvent, ReactElement } from 'react';
import { Link } from 'react-router';
import type { DropPosition } from './dropTarget';
import styles from './PageTree.module.css';

const defaultIcons: Record<PageKind, string> = {
  doc: '📄',
  database: '🗃️',
  dashboard: '📊',
  bpmn: '🔀',
};

export interface PageTreeHandlers {
  activeId: string | undefined;
  expandedIds: ReadonlySet<string>;
  dropHint: { id: string; position: DropPosition } | undefined;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onTrash: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (node: PageTreeNode, event: DragEvent<HTMLElement>) => void;
  onDrop: (node: PageTreeNode, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}

interface PageTreeItemProps {
  node: PageTreeNode;
  depth: number;
  handlers: PageTreeHandlers;
}

const hintClass: Record<DropPosition, string | undefined> = {
  before: styles.dropBefore,
  inside: styles.dropInside,
  after: styles.dropAfter,
};

export function PageTreeItem({ node, depth, handlers }: PageTreeItemProps): ReactElement {
  const isExpanded = handlers.expandedIds.has(node.id);
  const hint = handlers.dropHint?.id === node.id ? handlers.dropHint.position : undefined;
  const rowClasses = [
    styles.row,
    node.id === handlers.activeId ? styles.active : undefined,
    hint ? hintClass[hint] : undefined,
  ];

  return (
    <li>
      <div
        className={rowClasses.filter(Boolean).join(' ')}
        style={{ paddingLeft: 4 + depth * 14 }}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', node.id);
          handlers.onDragStart(node.id);
        }}
        onDragOver={(event) => handlers.onDragOver(node, event)}
        onDrop={(event) => handlers.onDrop(node, event)}
        onDragEnd={handlers.onDragEnd}
      >
        <button
          type="button"
          className={styles.iconButton}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          onClick={() => handlers.onToggle(node.id)}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
        <Link to={`/pages/${node.id}`} className={styles.title} draggable={false}>
          <span className={styles.icon}>{node.icon ?? defaultIcons[node.kind]}</span>
          {node.title || 'Untitled'}
        </Link>
        <span className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Move to trash"
            title="Move to trash"
            onClick={() => handlers.onTrash(node.id)}
          >
            🗑
          </button>
          {node.kind === 'doc' && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Add subpage"
              title="Add subpage"
              onClick={() => handlers.onAddChild(node.id)}
            >
              +
            </button>
          )}
        </span>
      </div>
      {isExpanded && (
        <ul className={styles.list}>
          {node.children.length === 0 ? (
            <li className={styles.empty} style={{ paddingLeft: 26 + depth * 14 }}>
              No pages inside
            </li>
          ) : (
            node.children.map((child) => (
              <PageTreeItem key={child.id} node={child} depth={depth + 1} handlers={handlers} />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
