import type { DatabaseProperty, DatabaseRow, DatabaseView, ViewColumn } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { PropertyCell } from './PropertyCell';
import styles from './Table.module.css';
import { TableHeader } from './TableHeader';
import { tableColumns } from './columns';
import type { DatabaseActions } from './useDatabaseActions';

interface TableViewProps {
  properties: DatabaseProperty[];
  view: DatabaseView;
  rows: DatabaseRow[];
  actions: DatabaseActions;
}

export function TableView({ properties, view, rows, actions }: TableViewProps): ReactElement {
  const columns = tableColumns(properties, view.config.columns);
  const visible = columns.filter((column) => !column.hidden);
  const setColumns = (next: ViewColumn[]): void =>
    actions.updateView(view.id, { config: { ...view.config, columns: next } });

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <TableHeader columns={columns} actions={actions} onColumnsChange={setColumns} />
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={styles.row}>
              {visible.map(({ property }) => (
                <td key={property.id} className={styles.td}>
                  {property.type === 'title' ? (
                    <span className={styles.titleCell}>
                      <PropertyCell
                        property={property}
                        value={row.title}
                        onChange={(value) =>
                          void actions.updateRow(row.id, {
                            title: typeof value === 'string' ? value : '',
                          })
                        }
                      />
                      <Link to={`/pages/${row.id}`} className={styles.open}>
                        Open
                      </Link>
                    </span>
                  ) : (
                    <PropertyCell
                      property={property}
                      value={row.properties[property.id]}
                      onChange={(value) =>
                        void actions.updateRow(row.id, { properties: { [property.id]: value } })
                      }
                    />
                  )}
                </td>
              ))}
              <td className={styles.tdAction}>
                <button
                  type="button"
                  className={styles.rowAction}
                  title="Move to trash"
                  aria-label="Move row to trash"
                  onClick={() => actions.trashRow(row.id)}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.newRow} onClick={() => actions.createRow({})}>
        + New
      </button>
    </div>
  );
}
