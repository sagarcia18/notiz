import type { DatabaseProperty, ViewSort } from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './Database.module.css';

interface SortPanelProps {
  properties: DatabaseProperty[];
  sorts: ViewSort[];
  onChange: (sorts: ViewSort[]) => void;
}

/** Edits the view's sort levels; without sorts rows keep their manual order. */
export function SortPanel({ properties, sorts, onChange }: SortPanelProps): ReactElement {
  const replace = (index: number, patch: Partial<ViewSort>): void =>
    onChange(sorts.map((sort, i) => (i === index ? { ...sort, ...patch } : sort)));
  const unused = properties.find((property) => !sorts.some((s) => s.propertyId === property.id));

  return (
    <>
      {sorts.length === 0 && <span className={styles.muted}>Manual order</span>}
      {sorts.map((sort, index) => (
        <div key={sort.propertyId} className={styles.line}>
          <select
            className={`${styles.select} ${styles.grow}`}
            aria-label="Sort property"
            value={sort.propertyId}
            onChange={(event) => replace(index, { propertyId: event.target.value })}
          >
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            aria-label="Sort direction"
            value={sort.direction}
            onChange={(event) =>
              replace(index, { direction: event.target.value === 'desc' ? 'desc' : 'asc' })
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <button
            type="button"
            className={styles.button}
            aria-label="Remove sort"
            onClick={() => onChange(sorts.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      {unused && (
        <button
          type="button"
          className={styles.button}
          onClick={() => onChange([...sorts, { propertyId: unused.id, direction: 'asc' }])}
        >
          + Add sort
        </button>
      )}
    </>
  );
}
