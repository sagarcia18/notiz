import {
  type DatabaseProperty,
  type FilterOperator,
  type ViewFilter,
  hasOptions,
  operatorNeedsValue,
  operatorsByType,
  statusGroupSchema,
} from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './Database.module.css';
import { groupLabels } from './OptionsEditor';

const operatorLabels: Record<FilterOperator, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  is_checked: 'is checked',
  is_not_checked: 'is not checked',
  in_group: 'is in group',
};

const dateOperatorLabels: Partial<Record<FilterOperator, string>> = {
  gt: 'is after',
  gte: 'is on or after',
  lt: 'is before',
  lte: 'is on or before',
};

function labelFor(property: DatabaseProperty, operator: FilterOperator): string {
  return (
    (property.type === 'date' ? dateOperatorLabels[operator] : undefined) ??
    operatorLabels[operator]
  );
}

interface ValueInputProps {
  property: DatabaseProperty;
  filter: ViewFilter;
  onChange: (value: string | number | undefined) => void;
}

function FilterValueInput({ property, filter, onChange }: ValueInputProps): ReactElement | null {
  if (!operatorNeedsValue(filter.operator)) return null;
  const value = filter.value ?? '';
  const choices =
    filter.operator === 'in_group'
      ? statusGroupSchema.options.map((group) => ({ id: group, name: groupLabels[group] }))
      : hasOptions(property.type)
        ? property.options
        : null;
  if (choices) {
    return (
      <select
        className={styles.select}
        aria-label="Filter value"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">—</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
    );
  }
  const type = property.type === 'number' ? 'number' : property.type === 'date' ? 'date' : 'text';
  return (
    <input
      key={`${property.id}-${filter.operator}`}
      className={styles.input}
      aria-label="Filter value"
      type={type}
      defaultValue={String(value)}
      onBlur={(event) => {
        const text = event.target.value;
        const parsed = type === 'number' && text !== '' ? Number(text) : text;
        if (parsed !== filter.value) onChange(text === '' ? undefined : parsed);
      }}
    />
  );
}

interface FilterPanelProps {
  properties: DatabaseProperty[];
  filters: ViewFilter[];
  onChange: (filters: ViewFilter[]) => void;
}

/** Edits the view's filters; all of them must match. */
export function FilterPanel({ properties, filters, onChange }: FilterPanelProps): ReactElement {
  const byId = new Map(properties.map((property) => [property.id, property]));
  const replace = (index: number, filter: ViewFilter): void =>
    onChange(filters.map((current, i) => (i === index ? filter : current)));
  const firstOperator = (property: DatabaseProperty): FilterOperator =>
    operatorsByType[property.type][0] ?? 'is_not_empty';

  return (
    <>
      {filters.length === 0 && <span className={styles.muted}>No filters</span>}
      {filters.map((filter, index) => {
        const property = byId.get(filter.propertyId);
        if (!property) return null;
        return (
          <div key={index} className={styles.line}>
            <select
              className={styles.select}
              aria-label="Filter property"
              value={property.id}
              onChange={(event) => {
                const next = byId.get(event.target.value);
                if (next) replace(index, { propertyId: next.id, operator: firstOperator(next) });
              }}
            >
              {properties.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              aria-label="Filter operator"
              value={filter.operator}
              onChange={(event) => {
                const operator = operatorsByType[property.type].find(
                  (op) => op === event.target.value,
                );
                if (operator) replace(index, { propertyId: property.id, operator });
              }}
            >
              {operatorsByType[property.type].map((operator) => (
                <option key={operator} value={operator}>
                  {labelFor(property, operator)}
                </option>
              ))}
            </select>
            <FilterValueInput
              property={property}
              filter={filter}
              onChange={(value) => replace(index, { ...filter, value })}
            />
            <button
              type="button"
              className={styles.button}
              aria-label="Remove filter"
              onClick={() => onChange(filters.filter((_, i) => i !== index))}
            >
              ×
            </button>
          </div>
        );
      })}
      {properties[0] && (
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            const property = properties[0];
            if (property)
              onChange([
                ...filters,
                { propertyId: property.id, operator: firstOperator(property) },
              ]);
          }}
        >
          + Add filter
        </button>
      )}
    </>
  );
}
