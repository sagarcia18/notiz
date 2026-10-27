import {
  type DatabaseProperty,
  type DatabaseRow,
  isEmptyValue,
  optionIdsOf,
  valueToText,
} from '@notiz/shared';
import type { DragEvent, ReactElement } from 'react';
import { Link } from 'react-router';
import styles from './Board.module.css';
import { OptionPill } from './OptionPill';

interface BoardCardProps {
  row: DatabaseRow;
  properties: DatabaseProperty[];
  dragging: boolean;
  dropBefore: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

function CardValue({
  property,
  row,
}: {
  property: DatabaseProperty;
  row: DatabaseRow;
}): ReactElement | null {
  const value = row.properties[property.id];
  if (isEmptyValue(value) || value === false) return null;
  const chosen = property.options.filter((option) => optionIdsOf(value).includes(option.id));
  if (chosen.length > 0) {
    return (
      <span className={styles.cardPills}>
        {chosen.map((option) => (
          <OptionPill key={option.id} option={option} />
        ))}
      </span>
    );
  }
  const text = property.type === 'checkbox' ? `✓ ${property.name}` : valueToText(property, value);
  return <span className={styles.cardValue}>{text}</span>;
}

/** A draggable row card showing its title and the chosen properties (read-only). */
export function BoardCard({
  row,
  properties,
  dragging,
  dropBefore,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: BoardCardProps): ReactElement {
  const classes = [
    styles.card,
    dragging ? styles.dragging : '',
    dropBefore ? styles.dropBefore : '',
  ];
  return (
    <div
      className={classes.join(' ')}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', row.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Link to={`/pages/${row.id}`} className={styles.cardTitle} draggable={false}>
        {row.icon && <span>{row.icon} </span>}
        {row.title || 'Untitled'}
      </Link>
      {properties.map((property) => (
        <CardValue key={property.id} property={property} row={row} />
      ))}
    </div>
  );
}
