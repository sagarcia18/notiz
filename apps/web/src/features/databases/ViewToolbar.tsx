import type { DatabaseProperty, DatabaseView, ViewConfig } from '@notiz/shared';
import type { ReactElement } from 'react';
import { tableColumns, updateColumn } from './columns';
import styles from './Database.module.css';
import { FilterPanel } from './FilterPanel';
import { Popover } from './Popover';
import { SortPanel } from './SortPanel';

interface ViewToolbarProps {
  properties: DatabaseProperty[];
  view: DatabaseView;
  onConfigChange: (config: ViewConfig) => void;
}

function countLabel(label: string, count: number): string {
  return count === 0 ? label : `${label} (${String(count)})`;
}

function TableColumnsPanel({ properties, view, onConfigChange }: ViewToolbarProps): ReactElement {
  const columns = tableColumns(properties, view.config.columns);
  return (
    <>
      {columns.slice(1).map((column) => (
        <label key={column.property.id} className={styles.line}>
          <input
            type="checkbox"
            checked={!column.hidden}
            onChange={(event) =>
              onConfigChange({
                ...view.config,
                columns: updateColumn(columns, column.property.id, {
                  hidden: !event.target.checked,
                }),
              })
            }
          />
          {column.property.name}
        </label>
      ))}
      {columns.length === 1 && <span className={styles.muted}>Only the title so far</span>}
    </>
  );
}

function BoardPanel({ properties, view, onConfigChange }: ViewToolbarProps): ReactElement {
  const groupable = properties.filter((p) => p.type === 'select' || p.type === 'status');
  const { cardPropertyIds } = view.config;
  return (
    <>
      <label className={styles.line}>
        <span className={styles.muted}>Group by</span>
        <select
          className={`${styles.select} ${styles.grow}`}
          value={view.config.groupByPropertyId ?? ''}
          onChange={(event) =>
            onConfigChange({ ...view.config, groupByPropertyId: event.target.value || null })
          }
        >
          <option value="">—</option>
          {groupable.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>
      </label>
      <span className={styles.muted}>Shown on cards</span>
      {properties
        .filter((property) => property.type !== 'title')
        .map((property) => (
          <label key={property.id} className={styles.line}>
            <input
              type="checkbox"
              checked={cardPropertyIds.includes(property.id)}
              onChange={(event) =>
                onConfigChange({
                  ...view.config,
                  cardPropertyIds: event.target.checked
                    ? [...cardPropertyIds, property.id]
                    : cardPropertyIds.filter((id) => id !== property.id),
                })
              }
            />
            {property.name}
          </label>
        ))}
    </>
  );
}

/** Filter, sort and layout settings of the active view. */
export function ViewToolbar(props: ViewToolbarProps): ReactElement {
  const { properties, view, onConfigChange } = props;
  const { filters, sorts } = view.config;
  const activeClass = (count: number): string =>
    [styles.button, count > 0 ? styles.buttonActive : ''].join(' ');
  return (
    <div className={styles.tools}>
      <Popover
        label={countLabel('Filter', filters.length)}
        buttonClassName={activeClass(filters.length)}
        alignRight
      >
        <FilterPanel
          properties={properties}
          filters={filters}
          onChange={(next) => onConfigChange({ ...view.config, filters: next })}
        />
      </Popover>
      <Popover
        label={countLabel('Sort', sorts.length)}
        buttonClassName={activeClass(sorts.length)}
        alignRight
      >
        <SortPanel
          properties={properties}
          sorts={sorts}
          onChange={(next) => onConfigChange({ ...view.config, sorts: next })}
        />
      </Popover>
      <Popover label={view.type === 'board' ? 'Board' : 'Properties'} alignRight>
        {view.type === 'board' ? <BoardPanel {...props} /> : <TableColumnsPanel {...props} />}
      </Popover>
    </div>
  );
}
