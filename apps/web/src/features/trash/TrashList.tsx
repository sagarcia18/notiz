import type { TrashEntry } from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './TrashPage.module.css';

interface TrashListProps {
  entries: TrashEntry[];
  onRestore: (id: string) => void;
  onPurge: (entry: TrashEntry) => void;
}

export function TrashList({ entries, onRestore, onPurge }: TrashListProps): ReactElement {
  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.item}>
          <span className={styles.name}>
            {entry.icon ?? '📄'} {entry.title || 'Untitled'}
          </span>
          <span className={styles.date}>{new Date(entry.deletedAt).toLocaleString()}</span>
          <button type="button" className={styles.button} onClick={() => onRestore(entry.id)}>
            Restore
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.danger}`}
            onClick={() => onPurge(entry)}
          >
            Delete forever
          </button>
        </li>
      ))}
    </ul>
  );
}
