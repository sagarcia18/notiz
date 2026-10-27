import {
  type DatabaseProperty,
  type PropertyType,
  type UpdatePropertyInput,
  propertyTypeSchema,
} from '@notiz/shared';
import type { ReactElement } from 'react';
import { blurOnEnter } from './blurOnEnter';
import styles from './Database.module.css';
import { OptionsEditor } from './OptionsEditor';

export const typeLabels: Record<PropertyType, string> = {
  title: 'Title',
  text: 'Text',
  number: 'Number',
  select: 'Select',
  status: 'Status',
  date: 'Date',
  checkbox: 'Checkbox',
  url: 'URL',
};

const editableTypes = propertyTypeSchema.options.filter(
  (type): type is Exclude<PropertyType, 'title'> => type !== 'title',
);

interface PropertyMenuProps {
  property: DatabaseProperty;
  onUpdate: (input: UpdatePropertyInput) => void;
  onDelete: () => void;
  onHide?: () => void;
  onMove?: (delta: number) => void;
}

/** Rename, retype, edit options, move, hide or delete one property. */
export function PropertyMenu({
  property,
  onUpdate,
  onDelete,
  onHide,
  onMove,
}: PropertyMenuProps): ReactElement {
  const isTitle = property.type === 'title';
  return (
    <>
      <input
        key={property.name}
        className={styles.input}
        aria-label="Property name"
        defaultValue={property.name}
        onKeyDown={blurOnEnter}
        maxLength={100}
        onBlur={(event) => {
          const name = event.target.value.trim();
          if (name !== '' && name !== property.name) onUpdate({ name });
        }}
      />
      <label className={styles.line}>
        <span className={styles.muted}>Type</span>
        <select
          className={`${styles.select} ${styles.grow}`}
          value={property.type}
          disabled={isTitle}
          onChange={(event) => {
            const type = editableTypes.find((candidate) => candidate === event.target.value);
            const confirmed =
              type !== undefined &&
              window.confirm('Changing the type converts or clears existing values. Continue?');
            if (type && confirmed) onUpdate({ type });
          }}
        >
          {(isTitle ? propertyTypeSchema.options : editableTypes).map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      {(property.type === 'select' || property.type === 'status') && (
        <OptionsEditor
          options={property.options}
          withGroups={property.type === 'status'}
          onChange={(options) => onUpdate({ options })}
        />
      )}
      {!isTitle && (
        <div className={styles.line}>
          {onMove && (
            <>
              <button type="button" className={styles.button} onClick={() => onMove(-1)}>
                ← Move
              </button>
              <button type="button" className={styles.button} onClick={() => onMove(1)}>
                Move →
              </button>
            </>
          )}
          {onHide && (
            <button type="button" className={styles.button} onClick={onHide}>
              Hide
            </button>
          )}
          <button
            type="button"
            className={`${styles.button} ${styles.danger}`}
            onClick={() => {
              if (window.confirm(`Delete property "${property.name}" and all its values?`)) {
                onDelete();
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
