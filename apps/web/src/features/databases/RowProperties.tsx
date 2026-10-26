import type { PropertyValues } from '@notiz/shared';
import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { PropertyCell } from './PropertyCell';
import styles from './RowProperties.module.css';
import { useDatabase, useUpdateRow } from './useDatabase';

interface RowPropertiesProps {
  databaseId: string;
  rowId: string;
  values: PropertyValues;
}

/** Property list above the editor when a database row is opened as a page. */
export function RowProperties({ databaseId, rowId, values }: RowPropertiesProps): ReactElement {
  const database = useDatabase(databaseId);
  const updateRow = useUpdateRow(databaseId);
  const properties = database.data?.properties.filter((property) => property.type !== 'title');

  return (
    <section className={styles.panel} aria-label="Properties">
      <Link to={`/pages/${databaseId}`} className={styles.back}>
        ← Back to database
      </Link>
      {properties?.map((property) => (
        <div key={property.id} className={styles.line}>
          <span className={styles.name}>{property.name}</span>
          <span className={styles.value}>
            <PropertyCell
              property={property}
              value={values[property.id]}
              onChange={(value) =>
                updateRow.mutate({ id: rowId, input: { properties: { [property.id]: value } } })
              }
            />
          </span>
        </div>
      ))}
      {(database.error ?? updateRow.error) && (
        <p className={styles.error}>{(database.error ?? updateRow.error)?.message}</p>
      )}
    </section>
  );
}
