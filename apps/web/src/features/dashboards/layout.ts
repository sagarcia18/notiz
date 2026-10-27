import type { DashboardWidget, UpdateDashboardLayoutInput } from '@notiz/shared';

/** The part of a react-grid-layout item this app reads and writes. */
export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MIN_WIDGET_SIZE = 2;

export function toGridLayout(
  widgets: DashboardWidget[],
): (GridItem & { minW: number; minH: number })[] {
  return widgets.map(({ id, layout }) => ({
    i: id,
    ...layout,
    minW: MIN_WIDGET_SIZE,
    minH: MIN_WIDGET_SIZE,
  }));
}

/** Positions that differ from the saved ones; empty when nothing moved (e.g. on mount). */
export function changedLayouts(
  widgets: DashboardWidget[],
  layout: readonly GridItem[],
): UpdateDashboardLayoutInput['items'] {
  const saved = new Map(widgets.map((widget) => [widget.id, widget.layout]));
  return layout.flatMap(({ i, x, y, w, h }) => {
    const current = saved.get(i);
    if (current === undefined) {
      return [];
    }
    const unchanged = current.x === x && current.y === y && current.w === w && current.h === h;
    return unchanged ? [] : [{ id: i, layout: { x, y, w, h } }];
  });
}
