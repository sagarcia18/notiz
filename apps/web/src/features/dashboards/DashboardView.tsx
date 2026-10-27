import { GRID_COLUMNS, type WidgetType } from '@notiz/shared';
import type { ReactElement } from 'react';
import GridLayout, { useContainerWidth } from 'react-grid-layout';
import { absoluteStrategy } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import dbStyles from '../databases/Database.module.css';
import styles from './Dashboard.module.css';
import { changedLayouts, toGridLayout } from './layout';
import {
  useCreateWidget,
  useDashboard,
  useDeleteWidget,
  useSaveLayout,
  useUpdateWidget,
} from './useDashboard';
import { DRAG_HANDLE_CLASS, WidgetCard } from './WidgetCard';

const ROW_HEIGHT = 40;
/** The settings popover renders inside the header (the drag handle); using it must not drag. */
const dragCancelSelector = `button, .${dbStyles.popover ?? ''}, .${dbStyles.backdrop ?? ''}`;
const newWidgetButtons: { type: WidgetType; label: string }[] = [
  { type: 'kpi', label: '+ Number' },
  { type: 'bar', label: '+ Bar chart' },
  { type: 'pie', label: '+ Pie chart' },
];

export function DashboardView({ dashboardId }: { dashboardId: string }): ReactElement {
  const dashboard = useDashboard(dashboardId);
  const createWidget = useCreateWidget(dashboardId);
  const updateWidget = useUpdateWidget(dashboardId);
  const deleteWidget = useDeleteWidget(dashboardId);
  const saveLayout = useSaveLayout(dashboardId);
  const { width, containerRef, mounted } = useContainerWidth();
  const error =
    dashboard.error ??
    createWidget.error ??
    updateWidget.error ??
    deleteWidget.error ??
    saveLayout.error;
  const widgets = dashboard.data?.widgets ?? [];

  return (
    <div className={styles.dashboard}>
      <div className={dbStyles.tools}>
        {newWidgetButtons.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            className={dbStyles.button}
            disabled={createWidget.isPending}
            onClick={() => createWidget.mutate({ config: { type } })}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className={dbStyles.error}>{error.message}</p>}
      {dashboard.isPending && <p className={dbStyles.muted}>Loading…</p>}
      {dashboard.data && widgets.length === 0 && (
        <p className={dbStyles.muted}>Add a number or a chart to start.</p>
      )}
      <div ref={containerRef}>
        {mounted && widgets.length > 0 && (
          <GridLayout
            width={width}
            layout={toGridLayout(widgets)}
            gridConfig={{ cols: GRID_COLUMNS, rowHeight: ROW_HEIGHT }}
            dragConfig={{ handle: `.${DRAG_HANDLE_CLASS}`, cancel: dragCancelSelector }}
            positionStrategy={absoluteStrategy}
            onLayoutChange={(layout) => {
              const items = changedLayouts(widgets, layout);
              if (items.length > 0) saveLayout.mutate({ items });
            }}
          >
            {widgets.map((widget) => (
              <div key={widget.id}>
                <WidgetCard
                  widget={widget}
                  saving={updateWidget.isPending}
                  onSave={(config) => updateWidget.mutate({ id: widget.id, input: { config } })}
                  onDelete={() => deleteWidget.mutate(widget.id)}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
