import type { ReactElement } from 'react';
import { Link, Outlet } from 'react-router';
import { SidebarPages } from '../features/pages/SidebarPages';
import styles from './AppLayout.module.css';

export function AppLayout(): ReactElement {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          Notiz
        </Link>
        <SidebarPages />
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
