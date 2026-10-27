import {
  type DatabaseProperty,
  type PropertyType,
  type UpdatePropertyInput,
  hasOptions,
  propertyTypeSchema,
} from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import { blurOnEnter } from './blurOnEnter';
import styles from './Database.module.css';
import { OptionsEditor } from './OptionsEditor';
import { RelationTargetSelect } from './RelationTargetSelect';

export const typeLabels: Record<PropertyType, string> = {
  title: 'Title',
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multi_select: 'Multi-select',
  status: 'Status',
  date: 'Date',
  checkbox: 'Checkbox',
  url: 'URL',
  relation: 'Relation',
};

const typeChangeWarning = 'Changing the type converts or clears existing values. Continue?';

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
  // Switching to a relation waits until its database is chosen.
  const [choosingRelation, setChoosingRelation] = useState(false);
  const pickRelationTarget = (relationDatabaseId: string): void => {
    if (property.type !== 'relation') {
      if (window.confirm(typeChangeWarning)) onUpdate({ type: 'relation', relationDatabaseId });
      setChoosingRelation(false);
    } else if (
      relationDatabaseId !== property.relationDatabaseId &&
      window.confirm('Changing the database clears the linked rows. Continue?')
    ) {
      onUpdate({ relationDatabaseId });
    }
  };
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
          value={choosingRelation ? 'relation' : property.type}
          disabled={isTitle}
          onChange={(event) => {
            const type = editableTypes.find((candidate) => candidate === event.target.value);
            setChoosingRelation(type === 'relation' && property.type !== 'relation');
            if (type === 'relation' || type === property.type) return;
            if (type && window.confirm(typeChangeWarning)) onUpdate({ type });
          }}
        >
          {(isTitle ? propertyTypeSchema.options : editableTypes).map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </label>
      {(choosingRelation || property.type === 'relation') && (
        <RelationTargetSelect value={property.relationDatabaseId} onChange={pickRelationTarget} />
      )}
      {hasOptions(property.type) && (
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
