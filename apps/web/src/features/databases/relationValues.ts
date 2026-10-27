import type { DatabaseRow, PropertyValue } from '@notiz/shared';

export function rowLabel(row: Pick<DatabaseRow, 'title'>): string {
  return row.title.trim() === '' ? 'Untitled' : row.title;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Rows whose title contains the query, ignoring case and accents. */
export function searchRows(rows: readonly DatabaseRow[], query: string): DatabaseRow[] {
  const needle = normalize(query.trim());
  return rows.filter((row) => normalize(rowLabel(row)).includes(needle));
}

/** Linked row ids after toggling one; ids of rows no longer listed (trashed) are dropped. */
export function toggleRelation(
  rows: readonly DatabaseRow[],
  selected: readonly string[],
  rowId: string,
): PropertyValue {
  const listed = new Set(rows.map((row) => row.id));
  const kept = selected.filter((id) => listed.has(id));
  const next = kept.includes(rowId) ? kept.filter((id) => id !== rowId) : [...kept, rowId];
  return next.length > 0 ? next : null;
}
