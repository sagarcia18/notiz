import type { DatabaseProperty, ViewColumn } from '@notiz/shared';

export const DEFAULT_COLUMN_WIDTH = 180;

export interface TableColumn {
  property: DatabaseProperty;
  width: number;
  hidden: boolean;
}

/**
 * Table columns in display order: the title first, then the configured
 * columns, then properties the config does not mention yet.
 */
export function tableColumns(properties: DatabaseProperty[], config: ViewColumn[]): TableColumn[] {
  const byId = new Map(config.map((column) => [column.propertyId, column]));
  const position = (property: DatabaseProperty): number => {
    if (property.type === 'title') return -1;
    const index = config.findIndex((column) => column.propertyId === property.id);
    return index < 0 ? config.length : index;
  };
  return [...properties]
    .map((property, index) => ({ property, index, position: position(property) }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map(({ property }) => {
      const column = byId.get(property.id);
      return {
        property,
        width: column?.width ?? DEFAULT_COLUMN_WIDTH,
        hidden: property.type !== 'title' && column?.hidden === true,
      };
    });
}

function toConfig(columns: TableColumn[]): ViewColumn[] {
  return columns.map(({ property, width, hidden }) => {
    const column: ViewColumn = { propertyId: property.id };
    if (width !== DEFAULT_COLUMN_WIDTH) column.width = width;
    if (hidden) column.hidden = true;
    return column;
  });
}

/** The full column config after changing one column's width or visibility. */
export function updateColumn(
  columns: TableColumn[],
  propertyId: string,
  patch: Partial<Pick<TableColumn, 'width' | 'hidden'>>,
): ViewColumn[] {
  return toConfig(
    columns.map((column) => (column.property.id === propertyId ? { ...column, ...patch } : column)),
  );
}

/** Index `delta` visible columns away from `from`, staying behind the title. */
function stepVisible(columns: TableColumn[], from: number, delta: number): number {
  const direction = Math.sign(delta);
  let to = from;
  for (let steps = Math.abs(delta); steps > 0;) {
    const next = to + direction;
    if (next < 1 || next >= columns.length) break;
    to = next;
    if (columns[to]?.hidden !== true) steps -= 1;
  }
  return to;
}

/** The full column config after moving a column by `delta` visible places; the title stays first. */
export function moveColumn(
  columns: TableColumn[],
  propertyId: string,
  delta: number,
): ViewColumn[] {
  const from = columns.findIndex((column) => column.property.id === propertyId);
  const to = stepVisible(columns, from, delta);
  const moving = columns[from];
  if (from < 1 || !moving || to === from) {
    return toConfig(columns);
  }
  const rest = columns.filter((_, index) => index !== from);
  return toConfig([...rest.slice(0, to), moving, ...rest.slice(to)]);
}
