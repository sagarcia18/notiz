import { randomUUID } from 'node:crypto';
import {
  type CreateWidgetInput,
  type DashboardDetail,
  type DashboardWidget,
  type UpdateDashboardLayoutInput,
  type UpdateWidgetInput,
  type WidgetConfig,
  type WidgetData,
  type WidgetLayout,
  type WidgetType,
  widgetConfigSchema,
  widgetLayoutSchema,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../repositories/dashboards.repository.js';
import type { WidgetRow } from '../repositories/dashboards.repository.js';
import * as pagesRepo from '../repositories/pages.repository.js';
import { computeWidgetData } from './aggregation.service.js';

const defaultSizes: Record<WidgetType, Pick<WidgetLayout, 'w' | 'h'>> = {
  kpi: { w: 3, h: 3 },
  bar: { w: 6, h: 7 },
  pie: { w: 4, h: 7 },
};

function toWidget(row: WidgetRow): DashboardWidget {
  return {
    id: row.id,
    dashboardId: row.dashboardId,
    config: widgetConfigSchema.parse(JSON.parse(row.configJson) as unknown),
    layout: widgetLayoutSchema.parse(JSON.parse(row.layoutJson) as unknown),
    createdAt: row.createdAt,
  };
}

function requireDashboard(db: AppDatabase, id: string): void {
  const row = pagesRepo.findPage(db, id);
  if (!row || row.deletedAt !== null || row.kind !== 'dashboard') {
    throw new NotFoundError('Dashboard', id);
  }
}

function requireWidget(db: AppDatabase, id: string): WidgetRow {
  const row = repo.findWidget(db, id);
  if (!row) {
    throw new NotFoundError('Widget', id);
  }
  requireDashboard(db, row.dashboardId);
  return row;
}

/** A saved config must point at existing sources that fit the widget; they may disappear later. */
function assertConfigFits(db: AppDatabase, config: WidgetConfig): void {
  if (computeWidgetData(db, config).state === 'source_missing') {
    throw new ValidationError('The database, view or property of the widget does not fit');
  }
}

/** New widgets go below everything else in the left column. */
function nextLayout(widgets: DashboardWidget[], type: WidgetType): WidgetLayout {
  const bottom = Math.max(0, ...widgets.map(({ layout }) => layout.y + layout.h));
  return { x: 0, y: bottom, ...defaultSizes[type] };
}

export function getDashboard(db: AppDatabase, id: string): DashboardDetail {
  requireDashboard(db, id);
  return { id, widgets: repo.listWidgets(db, id).map(toWidget) };
}

export function createWidget(
  db: AppDatabase,
  dashboardId: string,
  input: CreateWidgetInput,
): DashboardWidget {
  return db.transaction(() => {
    const widgets = getDashboard(db, dashboardId).widgets;
    const config = widgetConfigSchema.parse(input.config);
    assertConfigFits(db, config);
    const layout =
      input.layout === undefined
        ? nextLayout(widgets, config.type)
        : widgetLayoutSchema.parse(input.layout);
    const row = repo.insertWidget(db, {
      id: randomUUID(),
      dashboardId,
      configJson: JSON.stringify(config),
      layoutJson: JSON.stringify(layout),
    });
    return toWidget(row);
  });
}

export function updateWidget(
  db: AppDatabase,
  id: string,
  input: UpdateWidgetInput,
): DashboardWidget {
  return db.transaction(() => {
    requireWidget(db, id);
    const config = input.config === undefined ? undefined : widgetConfigSchema.parse(input.config);
    if (config !== undefined) {
      assertConfigFits(db, config);
    }
    const layout = input.layout === undefined ? undefined : widgetLayoutSchema.parse(input.layout);
    const row = repo.updateWidget(db, id, {
      configJson: config === undefined ? undefined : JSON.stringify(config),
      layoutJson: layout === undefined ? undefined : JSON.stringify(layout),
    });
    return toWidget(row);
  });
}

export function deleteWidget(db: AppDatabase, id: string): void {
  db.transaction(() => {
    requireWidget(db, id);
    repo.deleteWidget(db, id);
  });
}

/** Saves the positions of several widgets at once (after dragging on the grid). */
export function updateDashboardLayout(
  db: AppDatabase,
  dashboardId: string,
  input: UpdateDashboardLayoutInput,
): DashboardDetail {
  return db.transaction(() => {
    const widgetIds = new Set(getDashboard(db, dashboardId).widgets.map((widget) => widget.id));
    for (const item of input.items) {
      if (!widgetIds.has(item.id)) {
        throw new ValidationError(`Widget ${item.id} is not on this dashboard`);
      }
      repo.updateWidget(db, item.id, { layoutJson: JSON.stringify(item.layout) });
    }
    return getDashboard(db, dashboardId);
  });
}

export function getWidgetData(db: AppDatabase, id: string): WidgetData {
  return computeWidgetData(db, toWidget(requireWidget(db, id)).config);
}
