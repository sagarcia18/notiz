import { type DashboardWidget, widgetConfigSchema } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { changedLayouts, stackedHeight, stackedWidgets, toGridLayout } from './layout';

const dashboardId = '00000000-0000-4000-8000-000000000001';

function widget(id: string, x: number, y: number): DashboardWidget {
  return {
    id,
    dashboardId,
    config: widgetConfigSchema.parse({ type: 'kpi' }),
    layout: { x, y, w: 3, h: 3 },
    createdAt: '',
  };
}

const widgets = [widget('a', 0, 0), widget('b', 3, 0)];

describe('dashboard layout', () => {
  it('maps widgets to grid items with minimum sizes', () => {
    expect(toGridLayout(widgets)[1]).toEqual({ i: 'b', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 });
  });

  it('reports nothing when the grid echoes the saved layout', () => {
    expect(changedLayouts(widgets, toGridLayout(widgets))).toEqual([]);
  });

  it('reports only moved or resized widgets and ignores unknown items', () => {
    const layout = [
      { i: 'a', x: 0, y: 3, w: 3, h: 3 },
      { i: 'b', x: 3, y: 0, w: 3, h: 3 },
      { i: 'gone', x: 0, y: 0, w: 1, h: 1 },
    ];
    expect(changedLayouts(widgets, layout)).toEqual([
      { id: 'a', layout: { x: 0, y: 3, w: 3, h: 3 } },
    ]);
  });
});

describe('stacked dashboard on phones', () => {
  it('orders widgets top to bottom, then left to right, without changing them', () => {
    const grid = [widget('right', 6, 0), widget('below', 0, 3), widget('left', 0, 0)];
    expect(stackedWidgets(grid).map(({ id }) => id)).toEqual(['left', 'right', 'below']);
    expect(grid.map(({ id }) => id)).toEqual(['right', 'below', 'left']);
  });

  it('keeps the grid height but never goes below a readable minimum', () => {
    expect(stackedHeight(widget('a', 0, 0), 40, 10)).toBe(160);
    const tall = { ...widget('b', 0, 0), layout: { x: 0, y: 0, w: 4, h: 6 } };
    expect(stackedHeight(tall, 40, 10)).toBe(290);
  });
});
