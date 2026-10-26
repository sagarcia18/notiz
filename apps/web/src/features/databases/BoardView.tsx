import type { DatabaseProperty, DatabaseRow, DatabaseView } from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import { BoardColumn, type DropHint } from './BoardColumn';
import styles from './Board.module.css';
import { groupRows, planBoardDrop } from './boardDrop';
import type { DatabaseActions } from './useDatabaseActions';

interface BoardViewProps {
  properties: DatabaseProperty[];
  view: DatabaseView;
  rows: DatabaseRow[];
  actions: DatabaseActions;
}

/** Cards grouped by a select or status property; drag cards to change value or order. */
export function BoardView({ properties, view, rows, actions }: BoardViewProps): ReactElement {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hint, setHint] = useState<DropHint | null>(null);
  const groupBy = properties.find((property) => property.id === view.config.groupByPropertyId);
  if (!groupBy) {
    return (
      <p className={styles.hint}>
        Choose a select or status property under “Board → Group by” to see this board.
      </p>
    );
  }

  const groups = groupRows(rows, groupBy);
  const cardProperties = view.config.cardPropertyIds.flatMap(
    (id) => properties.find((property) => property.id === id) ?? [],
  );

  const drop = async (target: DropHint): Promise<void> => {
    const rowId = draggedId;
    setDraggedId(null);
    setHint(null);
    if (rowId === null) return;
    const manualOrder = view.config.sorts.length === 0;
    const plan = planBoardDrop(groups, rowId, target.optionId, target.beforeRowId, manualOrder);
    if (!plan) return;
    if (plan.value !== undefined) {
      await actions.updateRow(rowId, { properties: { [groupBy.id]: plan.value } });
    }
    if (plan.position) {
      await actions.moveRow(rowId, { parentId: view.databaseId, ...plan.position });
    }
  };

  return (
    <div className={styles.board}>
      {groups.map((group) => (
        <BoardColumn
          key={group.optionId ?? 'none'}
          property={groupBy}
          group={group}
          cardProperties={cardProperties}
          draggedId={draggedId}
          hint={hint?.optionId === group.optionId ? hint : null}
          onDragStart={setDraggedId}
          onDragEnd={() => {
            setDraggedId(null);
            setHint(null);
          }}
          onHint={setHint}
          onDrop={(target) => void drop(target)}
          onAdd={() =>
            actions.createRow(
              group.optionId === null ? {} : { properties: { [groupBy.id]: group.optionId } },
            )
          }
        />
      ))}
    </div>
  );
}
