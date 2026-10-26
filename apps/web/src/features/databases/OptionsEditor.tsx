import {
  type PropertyOption,
  type PropertyOptionInput,
  type StatusGroup,
  optionColorSchema,
  statusGroupSchema,
} from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import styles from './Database.module.css';
import { OptionPill } from './OptionPill';

export const groupLabels: Record<StatusGroup, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  complete: 'Complete',
};

interface OptionsEditorProps {
  options: PropertyOption[];
  withGroups: boolean;
  onChange: (options: PropertyOptionInput[]) => void;
}

/** Edits the choices of a select or status property; each change is saved as a whole list. */
export function OptionsEditor({ options, withGroups, onChange }: OptionsEditorProps): ReactElement {
  const [newName, setNewName] = useState('');
  const replace = (index: number, patch: Partial<PropertyOption>): void =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  const colors = optionColorSchema.options;

  const add = (): void => {
    const name = newName.trim();
    if (name === '') return;
    const color = colors[options.length % colors.length] ?? 'gray';
    onChange([...options, { name, color, ...(withGroups ? { group: 'todo' as const } : {}) }]);
    setNewName('');
  };

  return (
    <div className={styles.database}>
      <span className={styles.muted}>Options</span>
      {options.map((option, index) => (
        <div key={option.id} className={styles.line}>
          <OptionPill option={option} />
          <input
            className={`${styles.input} ${styles.grow}`}
            aria-label="Option name"
            defaultValue={option.name}
            onBlur={(event) => {
              const name = event.target.value.trim();
              if (name !== '' && name !== option.name) replace(index, { name });
            }}
          />
          <select
            className={styles.select}
            aria-label="Option color"
            value={option.color}
            onChange={(event) =>
              replace(index, { color: optionColorSchema.parse(event.target.value) })
            }
          >
            {colors.map((color) => (
              <option key={color}>{color}</option>
            ))}
          </select>
          {withGroups && (
            <select
              className={styles.select}
              aria-label="Status group"
              value={option.group ?? 'todo'}
              onChange={(event) =>
                replace(index, { group: statusGroupSchema.parse(event.target.value) })
              }
            >
              {statusGroupSchema.options.map((group) => (
                <option key={group} value={group}>
                  {groupLabels[group]}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={styles.button}
            aria-label={`Delete option ${option.name}`}
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <input
        className={styles.input}
        placeholder="Add an option and press Enter"
        value={newName}
        maxLength={100}
        onChange={(event) => setNewName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') add();
        }}
      />
    </div>
  );
}
