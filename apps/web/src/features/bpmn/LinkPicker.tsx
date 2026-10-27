import { type ReactElement, useState } from 'react';
import { useDatabase, useViewRows } from '../databases/useDatabase';
import { usePageTree } from '../pages/usePages';
import type { LinkTargetKind } from './bpmnServices';
import styles from './Bpmn.module.css';
import { type LinkTarget, filterTargets, flattenTargets, targetLabel } from './linkTargets';

export interface LinkPickerProps {
  diagramId: string;
  /** `database`: only databases are offered (for data stores). */
  targetKind: LinkTargetKind;
  linkedPageId: string | null;
  onPick: (pageId: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

type Tab = 'pages' | 'rows';

function TargetList({
  targets,
  onPick,
}: {
  targets: readonly LinkTarget[];
  onPick: (pageId: string) => void;
}): ReactElement {
  if (targets.length === 0) return <p className={styles.muted}>Nothing found</p>;
  return (
    <ul className={styles.targets}>
      {targets.map((target) => (
        <li key={target.id}>
          <button type="button" className={styles.target} onClick={() => onPick(target.id)}>
            {target.icon ?? '📄'} {targetLabel(target)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ViewRowTargets(props: {
  databaseId: string;
  viewId: string;
  query: string;
  onPick: (pageId: string) => void;
}): ReactElement {
  const rows = useViewRows(props.databaseId, props.viewId);
  if (!rows.data) return <p className={styles.muted}>Loading rows…</p>;
  const targets = rows.data.map((row) => ({ ...row, kind: 'doc' as const }));
  return <TargetList targets={filterTargets(targets, props.query)} onPick={props.onPick} />;
}

function RowTargets(props: {
  databaseId: string;
  query: string;
  onPick: (pageId: string) => void;
}): ReactElement {
  const database = useDatabase(props.databaseId);
  const viewId = database.data?.views[0]?.id;
  if (!viewId) return <p className={styles.muted}>Loading rows…</p>;
  return <ViewRowTargets {...props} viewId={viewId} />;
}

/** Chooses the page or database row a task links to, or the database of a data store. */
export function LinkPicker({
  diagramId,
  targetKind,
  linkedPageId,
  onPick,
  onRemove,
  onClose,
}: LinkPickerProps): ReactElement {
  const tree = usePageTree();
  const [tab, setTab] = useState<Tab>('pages');
  const [query, setQuery] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const pages = flattenTargets(tree.data ?? [], diagramId);
  const databases = pages.filter((page) => page.kind === 'database');
  const databasesOnly = targetKind === 'database';
  const listed = databasesOnly ? databases : pages;

  return (
    <div
      className={styles.picker}
      role="dialog"
      aria-label={databasesOnly ? 'Link data store to a database' : 'Link task to a page'}
    >
      <div className={styles.toolbar}>
        {!databasesOnly && (
          <>
            <button
              type="button"
              className={styles.button}
              aria-pressed={tab === 'pages'}
              onClick={() => setTab('pages')}
            >
              Pages
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={tab === 'rows'}
              onClick={() => setTab('rows')}
            >
              Database rows
            </button>
          </>
        )}
        {tab === 'rows' && !databasesOnly && (
          <select
            className={styles.select}
            aria-label="Database"
            value={databaseId}
            onChange={(event) => setDatabaseId(event.target.value)}
          >
            <option value="">Choose a database…</option>
            {databases.map((database) => (
              <option key={database.id} value={database.id}>
                {targetLabel(database)}
              </option>
            ))}
          </select>
        )}
        <input
          className={styles.search}
          aria-label={databasesOnly ? 'Search databases' : 'Search pages'}
          placeholder="Search…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {linkedPageId !== null && (
          <button type="button" className={styles.button} onClick={onRemove}>
            Remove link
          </button>
        )}
        <button type="button" className={styles.button} onClick={onClose}>
          Close
        </button>
      </div>
      {(databasesOnly || tab === 'pages') && (
        <TargetList targets={filterTargets(listed, query)} onPick={onPick} />
      )}
      {!databasesOnly && tab === 'rows' && databaseId !== '' && (
        <RowTargets databaseId={databaseId} query={query} onPick={onPick} />
      )}
    </div>
  );
}
