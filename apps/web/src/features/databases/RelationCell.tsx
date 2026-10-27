import { type DatabaseProperty, type PropertyValue, optionIdsOf } from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import { Link } from 'react-router';
import { Popover } from './Popover';
import styles from './PropertyCell.module.css';
import { rowLabel, searchRows, toggleRelation } from './relationValues';
import { useRelationRows } from './useRelationRows';

interface RelationCellProps {
  property: DatabaseProperty & { relationDatabaseId: string };
  value: PropertyValue | undefined;
  onChange: (value: PropertyValue) => void;
}

/** Titles of the linked rows; the popover searches the target database's rows. */
export function RelationCell({ property, value, onChange }: RelationCellProps): ReactElement {
  const rows = useRelationRows(property.relationDatabaseId);
  const [query, setQuery] = useState('');
  const selected = optionIdsOf(value);
  const linked = (rows.data ?? []).filter((row) => selected.includes(row.id));
  const label =
    linked.length > 0 ? (
      <span className={styles.pills}>
        {linked.map((row) => (
          <span key={row.id} className={styles.relationPill}>
            {rowLabel(row)}
          </span>
        ))}
      </span>
    ) : (
      <span className={styles.empty}>Empty</span>
    );
  return (
    <Popover label={label} title={property.name} buttonClassName={styles.multiButton}>
      <input
        className={styles.input}
        aria-label={`Search ${property.name}`}
        placeholder="Search rows…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {rows.error && <span className={styles.empty}>Related database not found</span>}
      {rows.data?.length === 0 && <span className={styles.empty}>No rows yet</span>}
      {searchRows(rows.data ?? [], query).map((row) => (
        <span key={row.id} className={styles.multiOption}>
          <label className={styles.relationOption}>
            <input
              type="checkbox"
              checked={selected.includes(row.id)}
              onChange={() => onChange(toggleRelation(rows.data ?? [], selected, row.id))}
            />
            {row.icon ?? '📄'} {rowLabel(row)}
          </label>
          <Link
            to={`/pages/${row.id}`}
            className={styles.link}
            aria-label={`Open ${rowLabel(row)}`}
          >
            ↗
          </Link>
        </span>
      ))}
    </Popover>
  );
}
