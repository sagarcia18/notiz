import type { DatabaseDetail, DatabaseView as View } from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import { BoardView } from './BoardView';
import styles from './Database.module.css';
import { TableView } from './TableView';
import { ViewTabs } from './ViewTabs';
import { ViewToolbar } from './ViewToolbar';
import { useDatabase, useViewRows } from './useDatabase';
import { type DatabaseActions, useDatabaseActions } from './useDatabaseActions';

interface ActiveViewProps {
  database: DatabaseDetail;
  view: View;
  actions: DatabaseActions;
}

function ActiveView({ database, view, actions }: ActiveViewProps): ReactElement {
  const rows = useViewRows(database.id, view.id);
  if (rows.isPending) return <p className={styles.muted}>Loading rows…</p>;
  if (rows.error) return <p className={styles.error}>{rows.error.message}</p>;
  const props = { properties: database.properties, view, rows: rows.data, actions };
  return view.type === 'board' ? <BoardView {...props} /> : <TableView {...props} />;
}

/** Views, toolbar and rows of a database page. */
export function DatabaseView({ databaseId }: { databaseId: string }): ReactElement {
  const database = useDatabase(databaseId);
  const actions = useDatabaseActions(databaseId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (database.isPending) return <p className={styles.muted}>Loading database…</p>;
  if (database.error) return <p className={styles.error}>{database.error.message}</p>;

  const { views } = database.data;
  const view = views.find((candidate) => candidate.id === selectedId) ?? views[0];
  if (!view) return <p className={styles.error}>This database has no views.</p>;

  return (
    <section className={styles.database}>
      <div className={styles.bar}>
        <ViewTabs
          views={views}
          activeId={view.id}
          onSelect={setSelectedId}
          onAdd={(type) => actions.createView({ type }, (created) => setSelectedId(created.id))}
          onRename={(id, name) => actions.updateView(id, { name })}
          onDelete={(id) => actions.deleteView(id)}
        />
        <ViewToolbar
          properties={database.data.properties}
          view={view}
          onConfigChange={(config) => actions.updateView(view.id, { config })}
        />
      </div>
      {actions.error && <p className={styles.error}>{actions.error.message}</p>}
      <ActiveView database={database.data} view={view} actions={actions} />
    </section>
  );
}
