import type { ViewColumn } from '@notiz/shared';
import { type PointerEvent, type ReactElement, useState } from 'react';
import { type TableColumn, moveColumn, updateColumn } from './columns';
import { Popover } from './Popover';
import { PropertyMenu } from './PropertyMenu';
import styles from './Table.module.css';
import type { DatabaseActions } from './useDatabaseActions';

interface TableHeaderProps {
  columns: TableColumn[];
  actions: DatabaseActions;
  onColumnsChange: (columns: ViewColumn[]) => void;
}

interface Resize {
  propertyId: string;
  startX: number;
  startWidth: number;
  width: number;
}

const MIN_WIDTH = 60;

/** Header row: property menus, column resizing and "add property". */
export function TableHeader({ columns, actions, onColumnsChange }: TableHeaderProps): ReactElement {
  const [resize, setResize] = useState<Resize | null>(null);

  const startResize = (column: TableColumn, event: PointerEvent<HTMLSpanElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResize({
      propertyId: column.property.id,
      startX: event.clientX,
      startWidth: column.width,
      width: column.width,
    });
  };

  return (
    <thead>
      <tr>
        {columns
          .filter((column) => !column.hidden)
          .map((column) => {
            const { property } = column;
            const width = resize?.propertyId === property.id ? resize.width : column.width;
            return (
              <th key={property.id} className={styles.th} style={{ width }}>
                <Popover label={property.name} buttonClassName={styles.headerButton}>
                  <PropertyMenu
                    property={property}
                    onUpdate={(input) => actions.updateProperty(property.id, input)}
                    onDelete={() => actions.deleteProperty(property.id)}
                    onHide={() =>
                      onColumnsChange(updateColumn(columns, property.id, { hidden: true }))
                    }
                    onMove={(delta) => onColumnsChange(moveColumn(columns, property.id, delta))}
                  />
                </Popover>
                <span
                  className={styles.resizer}
                  role="separator"
                  aria-label={`Resize ${property.name}`}
                  onPointerDown={(event) => startResize(column, event)}
                  onPointerMove={(event) => {
                    if (resize?.propertyId !== property.id) return;
                    const next = resize.startWidth + event.clientX - resize.startX;
                    setResize({ ...resize, width: Math.max(MIN_WIDTH, Math.round(next)) });
                  }}
                  onPointerUp={() => {
                    if (resize?.propertyId !== property.id) return;
                    onColumnsChange(updateColumn(columns, property.id, { width: resize.width }));
                    setResize(null);
                  }}
                />
              </th>
            );
          })}
        <th className={styles.thAdd}>
          <button
            type="button"
            className={styles.headerButton}
            title="Add property"
            aria-label="Add property"
            onClick={() => actions.createProperty({ name: 'Property', type: 'text' })}
          >
            +
          </button>
        </th>
      </tr>
    </thead>
  );
}
