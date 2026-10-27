import type { PageTreeNode } from '@notiz/shared';
import type { ReactElement } from 'react';
import { usePageTree } from '../pages/usePages';
import styles from './Database.module.css';

function databasesOf(nodes: readonly PageTreeNode[]): PageTreeNode[] {
  return nodes.flatMap((node) => [
    ...(node.kind === 'database' ? [node] : []),
    ...databasesOf(node.children),
  ]);
}

interface RelationTargetSelectProps {
  value: string | null;
  onChange: (databaseId: string) => void;
}

/** Chooses the database a relation property links to. */
export function RelationTargetSelect({ value, onChange }: RelationTargetSelectProps): ReactElement {
  const tree = usePageTree();
  return (
    <label className={styles.line}>
      <span className={styles.muted}>Database</span>
      <select
        className={`${styles.select} ${styles.grow}`}
        aria-label="Related database"
        value={value ?? ''}
        onChange={(event) => {
          if (event.target.value !== '') onChange(event.target.value);
        }}
      >
        <option value="">Choose a database…</option>
        {databasesOf(tree.data ?? []).map((database) => (
          <option key={database.id} value={database.id}>
            {database.icon ?? '▦'} {database.title.trim() === '' ? 'Untitled' : database.title}
          </option>
        ))}
      </select>
    </label>
  );
}
