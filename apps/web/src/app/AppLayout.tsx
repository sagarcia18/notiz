import type { MouseEvent, ReactElement } from 'react';
import { Link, Outlet } from 'react-router';
import { NotionImport } from '../features/import/NotionImport';
import { SidebarPages } from '../features/pages/SidebarPages';
import { SearchCommand } from '../features/search/SearchCommand';
import { McpAccess } from '../features/settings/McpAccess';
import { useBreakpoint } from '../lib/useMediaQuery';
import styles from './AppLayout.module.css';
import { useSidebarDrawer } from './useSidebarDrawer';

export function AppLayout(): ReactElement {
  const drawer = useSidebarDrawer();
  const isDrawer = useBreakpoint() !== 'desktop';
  const hidden = isDrawer && !drawer.open;

  // Tapping a link that stays on the same path would not close the drawer otherwise.
  const closeOnLink = (event: MouseEvent<HTMLElement>): void => {
    if (event.target instanceof Element && event.target.closest('a')) drawer.close();
  };

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={drawer.open ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={drawer.open}
          aria-controls="sidebar"
          onClick={drawer.toggle}
        >
          ☰
        </button>
        <Link to="/" className={styles.topBrand}>
          Notiz
        </Link>
      </div>
      {isDrawer && drawer.open && (
        <div className={styles.overlay} data-testid="sidebar-overlay" onClick={drawer.close} />
      )}
      <aside
        id="sidebar"
        className={[styles.sidebar, drawer.open ? styles.sidebarOpen : undefined]
          .filter(Boolean)
          .join(' ')}
        inert={hidden}
        aria-hidden={hidden || undefined}
        onClick={isDrawer ? closeOnLink : undefined}
      >
        <Link to="/" className={styles.brand}>
          Notiz
        </Link>
        <SearchCommand />
        <SidebarPages />
        <footer className={styles.sidebarFooter}>
          <NotionImport />
          <McpAccess />
        </footer>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
