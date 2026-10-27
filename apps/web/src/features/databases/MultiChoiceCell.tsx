import { type DatabaseProperty, type PropertyValue, optionIdsOf } from '@notiz/shared';
import type { ReactElement } from 'react';
import { OptionPill } from './OptionPill';
import { Popover } from './Popover';
import styles from './PropertyCell.module.css';

interface MultiChoiceCellProps {
  property: DatabaseProperty;
  value: PropertyValue | undefined;
  onChange: (value: PropertyValue) => void;
}

/** Selected ids after toggling one option, in option order; empty means cleared. */
export function toggleOption(
  property: DatabaseProperty,
  selected: readonly string[],
  optionId: string,
): PropertyValue {
  const next = selected.includes(optionId)
    ? selected.filter((id) => id !== optionId)
    : [...selected, optionId];
  const ordered = property.options.map((option) => option.id).filter((id) => next.includes(id));
  return ordered.length > 0 ? ordered : null;
}

/** Pills of the chosen options; the popover lists every option with a checkbox. */
export function MultiChoiceCell({ property, value, onChange }: MultiChoiceCellProps): ReactElement {
  const selected = optionIdsOf(value);
  const chosen = property.options.filter((option) => selected.includes(option.id));
  const label =
    chosen.length > 0 ? (
      <span className={styles.pills}>
        {chosen.map((option) => (
          <OptionPill key={option.id} option={option} />
        ))}
      </span>
    ) : (
      <span className={styles.empty}>Empty</span>
    );
  return (
    <Popover label={label} title={property.name} buttonClassName={styles.multiButton}>
      {property.options.length === 0 && <span className={styles.empty}>No options yet</span>}
      {property.options.map((option) => (
        <label key={option.id} className={styles.multiOption}>
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => onChange(toggleOption(property, selected, option.id))}
          />
          <OptionPill option={option} />
        </label>
      ))}
    </Popover>
  );
}
