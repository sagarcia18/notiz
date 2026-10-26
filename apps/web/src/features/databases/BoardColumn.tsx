import type { DatabaseProperty, DatabaseRow } from '@notiz/shared';
import type { DragEvent, ReactElement } from 'react';
import { BoardCard } from './BoardCard';
import styles from './Board.module.css';
import type { BoardGroup } from './boardDrop';
import { OptionPill } from './OptionPill';

/** Where a dragged card would land: before `beforeRowId`, or at the end when null. */
export interface DropHint {
  optionId: string | null;
  beforeRowId: string | null;
}

interface BoardColumnProps {
  property: DatabaseProperty;
  group: BoardGroup;
  cardProperties: DatabaseProperty[];
  draggedId: string | null;
  hint: DropHint | null;
  onDragStart: (rowId: string) => void;
  onDragEnd: () => void;
  onHint: (hint: DropHint) => void;
  onDrop: (hint: DropHint) => void;
  onAdd: () => void;
}

/** Card under the pointer: upper half drops before it, lower half before the next card. */
function hintForCard(group: BoardGroup, index: number, event: DragEvent<HTMLElement>): DropHint {
  const box = event.currentTarget.getBoundingClientRect();
  const lowerHalf = event.clientY > box.top + box.height / 2;
  const target = lowerHalf ? group.rows[index + 1] : group.rows[index];
  return { optionId: group.optionId, beforeRowId: target?.id ?? null };
}

export function BoardColumn({
  property,
  group,
  cardProperties,
  draggedId,
  hint,
  onDragStart,
  onDragEnd,
  onHint,
  onDrop,
  onAdd,
}: BoardColumnProps): ReactElement {
  const option = property.options.find((candidate) => candidate.id === group.optionId);
  const endHint: DropHint = { optionId: group.optionId, beforeRowId: null };
  const allowDrop = (event: DragEvent<HTMLElement>, next: DropHint): void => {
    if (draggedId === null) return;
    event.preventDefault();
    event.stopPropagation();
    if (hint?.beforeRowId !== next.beforeRowId || hint.optionId !== next.optionId) onHint(next);
  };
  const dropHere = (event: DragEvent<HTMLElement>, next: DropHint): void => {
    event.preventDefault();
    event.stopPropagation();
    onDrop(next);
  };

  return (
    <div
      className={styles.column}
      onDragOver={(event) => allowDrop(event, endHint)}
      onDrop={(event) => dropHere(event, hint ?? endHint)}
    >
      <header className={styles.columnHeader}>
        {option ? (
          <OptionPill option={option} />
        ) : (
          <span className={styles.noValue}>No {property.name}</span>
        )}
        <span className={styles.count}>{group.rows.length}</span>
      </header>
      {group.rows.map((row: DatabaseRow, index) => (
        <BoardCard
          key={row.id}
          row={row}
          properties={cardProperties}
          dragging={row.id === draggedId}
          dropBefore={hint?.beforeRowId === row.id}
          onDragStart={() => onDragStart(row.id)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => allowDrop(event, hintForCard(group, index, event))}
          onDrop={(event) => dropHere(event, hintForCard(group, index, event))}
        />
      ))}
      {hint?.beforeRowId === null && <div className={styles.dropLine} />}
      <button type="button" className={styles.add} onClick={onAdd}>
        + New
      </button>
    </div>
  );
}
