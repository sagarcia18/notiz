import type { DatabaseView, ViewType } from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import styles from './Database.module.css';
import { Popover } from './Popover';

const viewIcons: Record<ViewType, string> = { table: '▦', board: '▥' };

interface ViewTabsProps {
  views: DatabaseView[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: (type: ViewType) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

/** View switcher: click selects, double-click renames, × deletes the active view, "+" adds one. */
export function ViewTabs({
  views,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: ViewTabsProps): ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null);
  const deleteView = (view: DatabaseView): void => {
    if (window.confirm(`Delete view "${view.name}"?`)) onDelete(view.id);
  };

  return (
    <div className={styles.tabs} role="tablist">
      {views.map((view) =>
        view.id === editingId ? (
          <input
            key={view.id}
            className={styles.input}
            aria-label="View name"
            defaultValue={view.name}
            maxLength={100}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') setEditingId(null);
            }}
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name !== '' && name !== view.name) onRename(view.id, name);
              setEditingId(null);
            }}
          />
        ) : (
          <span key={view.id} className={styles.tabGroup}>
            <button
              type="button"
              role="tab"
              aria-selected={view.id === activeId}
              className={[styles.tab, view.id === activeId ? styles.tabActive : ''].join(' ')}
              title="Double-click to rename"
              onClick={() => onSelect(view.id)}
              onDoubleClick={() => setEditingId(view.id)}
            >
              {viewIcons[view.type]} {view.name}
            </button>
            {view.id === activeId && views.length > 1 && (
              <button
                type="button"
                className={styles.tabDelete}
                aria-label={`Delete view ${view.name}`}
                title="Delete view"
                onClick={() => deleteView(view)}
              >
                ×
              </button>
            )}
          </span>
        ),
      )}
      <Popover label="+" title="Add view">
        <button type="button" className={styles.button} onClick={() => onAdd('table')}>
          {viewIcons.table} Table
        </button>
        <button type="button" className={styles.button} onClick={() => onAdd('board')}>
          {viewIcons.board} Board
        </button>
      </Popover>
    </div>
  );
}
