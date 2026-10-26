import type { DatabaseProperty, PropertyValue } from '@notiz/shared';
import { type KeyboardEvent, type ReactElement, useState } from 'react';
import { OptionPill } from './OptionPill';
import styles from './PropertyCell.module.css';

interface PropertyCellProps {
  property: DatabaseProperty;
  value: PropertyValue | undefined;
  onChange: (value: PropertyValue) => void;
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key === 'Enter') {
    event.currentTarget.blur();
  }
}

interface TextCellProps {
  initial: string;
  kind: 'text' | 'number' | 'url';
  label: string;
  onCommit: (text: string) => void;
}

/** Text-like editor that saves on blur or Enter. Render with a key of the stored value. */
function TextCell({ initial, kind, label, onCommit }: TextCellProps): ReactElement {
  const [text, setText] = useState(initial);
  const isLink = kind === 'url' && /^https?:\/\//i.test(initial);
  return (
    <span className={styles.textCell}>
      <input
        className={styles.input}
        aria-label={label}
        type={kind === 'number' ? 'number' : 'text'}
        step="any"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={blurOnEnter}
        onBlur={() => {
          if (text !== initial) onCommit(text);
        }}
      />
      {isLink && (
        <a className={styles.link} href={initial} target="_blank" rel="noreferrer" title={initial}>
          ↗
        </a>
      )}
    </span>
  );
}

function ChoiceCell({ property, value, onChange }: PropertyCellProps): ReactElement {
  const option = property.options.find((candidate) => candidate.id === value);
  return (
    <span className={styles.choice}>
      {option ? <OptionPill option={option} /> : <span className={styles.empty}>Empty</span>}
      <select
        className={styles.overlay}
        aria-label={property.name}
        value={option?.id ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
      >
        <option value="">—</option>
        {property.options.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Inline editor for one property value; every change is saved right away. */
export function PropertyCell({ property, value, onChange }: PropertyCellProps): ReactElement {
  switch (property.type) {
    case 'checkbox':
      return (
        <input
          type="checkbox"
          className={styles.checkbox}
          aria-label={property.name}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className={styles.input}
          aria-label={property.name}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      );
    case 'select':
    case 'status':
      return <ChoiceCell property={property} value={value} onChange={onChange} />;
    case 'number': {
      const initial = typeof value === 'number' ? String(value) : '';
      return (
        <TextCell
          key={initial}
          kind="number"
          label={property.name}
          initial={initial}
          onCommit={(text) => {
            const parsed = Number(text);
            onChange(text.trim() === '' || !Number.isFinite(parsed) ? null : parsed);
          }}
        />
      );
    }
    case 'title':
    case 'text':
    case 'url': {
      const initial = typeof value === 'string' ? value : '';
      return (
        <TextCell
          key={initial}
          kind={property.type === 'url' ? 'url' : 'text'}
          label={property.name}
          initial={initial}
          onCommit={(text) => onChange(text === '' ? null : text)}
        />
      );
    }
  }
}
