import type { ReactElement } from 'react';
import { Outlet } from 'react-router';
import styles from './AppLayout.module.css';

export function AppLayout(): ReactElement {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Notiz</div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
