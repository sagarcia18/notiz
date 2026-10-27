import { type DashboardWidget, widgetConfigSchema } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { changedLayouts, toGridLayout } from './layout';

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
