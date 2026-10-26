import type { DatabaseProperty, DatabaseRow } from '@notiz/shared';

/** One board column; `optionId` null is the "No value" column. */
export interface BoardGroup {
  optionId: string | null;
  rows: DatabaseRow[];
}

/** Groups rows by the property's options; unknown or empty values go to "No value" first. */
export function groupRows(rows: DatabaseRow[], property: DatabaseProperty): BoardGroup[] {
  const groups: BoardGroup[] = [
    { optionId: null, rows: [] },
    ...property.options.map((option) => ({ optionId: option.id, rows: [] })),
  ];
  for (const row of rows) {
    const value = row.properties[property.id];
    const group = groups.find((candidate) => candidate.optionId === value) ?? groups[0];
    group?.rows.push(row);
  }
  return groups;
}

export interface BoardDropPlan {
  /** New group value, only when the card changes column. */
  value?: string | null;
  /** New position among the database rows, only when manual order applies. */
  position?: { beforeId: string } | { afterId: string };
}

/**
 * What to save when a card is dropped into `targetOptionId` before
 * `beforeRowId` (null = end of column). Returns null when nothing changes.
 * Positions are only planned when the view has no sorts (manual order).
 */
export function planBoardDrop(
  groups: BoardGroup[],
  rowId: string,
  targetOptionId: string | null,
  beforeRowId: string | null,
  manualOrder: boolean,
): BoardDropPlan | null {
  const source = groups.find((group) => group.rows.some((row) => row.id === rowId));
  const target = groups.find((group) => group.optionId === targetOptionId);
  if (!source || !target || beforeRowId === rowId) {
    return null;
  }
  const plan: BoardDropPlan = {};
  if (source.optionId !== targetOptionId) {
    plan.value = targetOptionId;
  }
  if (manualOrder) {
    const others = target.rows.filter((row) => row.id !== rowId);
    const index = target.rows.findIndex((row) => row.id === rowId);
    const unchanged = index >= 0 && (target.rows[index + 1]?.id ?? null) === beforeRowId;
    const last = others.at(-1);
    if (!unchanged && beforeRowId !== null) {
      plan.position = { beforeId: beforeRowId };
    } else if (!unchanged && last) {
      plan.position = { afterId: last.id };
    }
  }
  return plan.value === undefined && plan.position === undefined ? null : plan;
}
