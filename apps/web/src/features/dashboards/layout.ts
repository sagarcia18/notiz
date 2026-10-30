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

/**
 * Phones show widgets in one column, in reading order of the saved grid:
 * top to bottom, then left to right. The saved layout itself is not touched.
 */
export function stackedWidgets(widgets: readonly DashboardWidget[]): DashboardWidget[] {
  return [...widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
}

const MIN_STACKED_HEIGHT = 160;

/** Pixel height of a stacked widget: as tall as on the grid, but never cramped. */
export function stackedHeight(widget: DashboardWidget, rowHeight: number, gap: number): number {
  const { h } = widget.layout;
  return Math.max(MIN_STACKED_HEIGHT, h * rowHeight + (h - 1) * gap);
}
