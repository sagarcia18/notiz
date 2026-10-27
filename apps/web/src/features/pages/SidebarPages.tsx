import type { PageKind } from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router';
import { PageTree } from './PageTree';
import styles from './SidebarPages.module.css';
import { useCreatePage, useMovePage, usePageTree, useTrashPage } from './usePages';

export function SidebarPages(): ReactElement {
  const tree = usePageTree();
  const createPage = useCreatePage();
  const movePage = useMovePage();
  const trashPage = useTrashPage();
  const navigate = useNavigate();
  const pageId = useMatch('/pages/:pageId')?.params.pageId;
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());

  const setExpanded = (id: string, expanded: boolean): void => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const create = (parentId: string | null, kind: PageKind = 'doc'): void => {
    createPage.mutate(
      { parentId, kind },
      {
        onSuccess: (page) => {
          if (parentId !== null) setExpanded(parentId, true);
          void navigate(`/pages/${page.id}`);
        },
      },
    );
  };

  const trash = (id: string): void => {
    trashPage.mutate(id, {
      onSuccess: () => {
        if (id === pageId) void navigate('/');
      },
    });
  };

  const error = tree.error ?? movePage.error ?? createPage.error ?? trashPage.error;

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        <span>Pages</span>
        <button
          type="button"
          className={styles.add}
          title="New page"
          aria-label="New page"
          onClick={() => create(null)}
        >
          +
        </button>
        <button
          type="button"
          className={styles.add}
          title="New database"
          aria-label="New database"
          onClick={() => create(null, 'database')}
        >
          ▦
        </button>
        <button
          type="button"
          className={styles.add}
          title="New dashboard"
          aria-label="New dashboard"
          onClick={() => create(null, 'dashboard')}
        >
          ◔
        </button>
      </div>
      {tree.data && (
        <PageTree
          nodes={tree.data}
          activeId={pageId}
          expandedIds={expandedIds}
          onToggle={(id) => setExpanded(id, !expandedIds.has(id))}
          onAddChild={(id) => create(id)}
          onTrash={trash}
          onMove={(id, input) => {
            movePage.mutate({ id, input });
            if (input.beforeId === undefined && input.afterId === undefined && input.parentId) {
              setExpanded(input.parentId, true);
            }
          }}
        />
      )}
      {tree.data?.length === 0 && <p className={styles.hint}>No pages yet</p>}
      {error && <p className={styles.error}>{error.message}</p>}
      <NavLink to="/trash" className={styles.trashLink}>
        🗑 Trash
      </NavLink>
    </nav>
  );
}
