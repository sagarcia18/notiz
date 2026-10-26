import type { TrashEntry } from '@notiz/shared';
import type { ReactElement } from 'react';
import { TrashList } from './TrashList';
import styles from './TrashPage.module.css';
import { useEmptyTrash, usePurgePage, useRestorePage, useTrash } from './useTrash';

export function TrashPage(): ReactElement {
  const trash = useTrash();
  const restorePage = useRestorePage();
  const purgePage = usePurgePage();
  const emptyTrash = useEmptyTrash();
  const error = trash.error ?? restorePage.error ?? purgePage.error ?? emptyTrash.error;

  const purge = (entry: TrashEntry): void => {
    const name = entry.title || 'Untitled';
    if (window.confirm(`Permanently delete "${name}" and its subpages? This cannot be undone.`)) {
      purgePage.mutate(entry.id);
    }
  };

  const empty = (): void => {
    if (window.confirm('Permanently delete everything in the trash? This cannot be undone.')) {
      emptyTrash.mutate();
    }
  };

  const entries = trash.data ?? [];

  return (
    <section>
      <header className={styles.header}>
        <h1>Trash</h1>
        {entries.length > 0 && (
          <button type="button" className={`${styles.button} ${styles.danger}`} onClick={empty}>
            Empty trash
          </button>
        )}
      </header>
      {error && <p className={styles.error}>{error.message}</p>}
      {trash.isPending && <p className={styles.muted}>Loading…</p>}
      {trash.isSuccess && entries.length === 0 && <p className={styles.muted}>Trash is empty.</p>}
      <TrashList entries={entries} onRestore={(id) => restorePage.mutate(id)} onPurge={purge} />
    </section>
  );
}
