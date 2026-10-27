import { dashboardDetailSchema, dashboardWidgetSchema } from '@notiz/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardApi } from './dashboardApi.js';
import { errorCode } from './pageApi.js';

describe('dashboards API', () => {
  let api: DashboardApi;

  beforeEach(() => {
    api = new DashboardApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function taskDatabase(): Promise<{ databaseId: string; statusId: string; viewId: string }> {
    const database = await api.createDatabase();
    const status = await api.addProperty(database.id, { name: 'Status', type: 'status' });
    const [todo, doing, done] = status.options.map((option) => option.id);
    await api.addRow(database.id, 'A', { [status.id]: todo ?? '' });
    await api.addRow(database.id, 'B', { [status.id]: doing ?? '' });
    await api.addRow(database.id, 'C', { [status.id]: done ?? '' });
    await api.addRow(database.id, 'D', { [status.id]: done ?? '' });
    const viewId = (await api.database(database.id)).views[0]?.id ?? '';
    return { databaseId: database.id, statusId: status.id, viewId };
  }

  it('creates widgets below each other and lists them', async () => {
    const dashboard = await api.createDashboard();
    const first = await api.addWidget(dashboard.id, { type: 'kpi' });
    const second = await api.addWidget(dashboard.id, { type: 'bar' });
    expect(first.layout).toEqual({ x: 0, y: 0, w: 3, h: 3 });
    expect(second.layout).toEqual({ x: 0, y: 3, w: 6, h: 7 });
    expect(first.config).toMatchObject({ metric: 'count', databaseId: null, title: '' });
    const detail = await api.dashboard(dashboard.id);
    expect(detail.widgets.map((widget) => widget.id)).toEqual([first.id, second.id]);
  });

  // Regression: widgets created in the same millisecond were ordered by their random id.
  it('lists widgets created in the same millisecond in creation order', async () => {
    const dashboard = await api.createDashboard();
    const insert = api.db.$client.prepare<[string, string]>(
      `insert into dashboard_widgets (id, dashboard_id, config_json, layout_json, created_at)
       values (?, ?, '{"type":"kpi"}', '{"x":0,"y":0,"w":3,"h":3}', '2026-10-27T00:00:00.000Z')`,
    );
    const first = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
    const second = '00000000-0000-4000-8000-000000000000';
    insert.run(first, dashboard.id);
    insert.run(second, dashboard.id);
    const detail = await api.dashboard(dashboard.id);
    expect(detail.widgets.map((widget) => widget.id)).toEqual([first, second]);
  });

  it('only serves dashboards', async () => {
    const doc = await api.create('Doc');
    const response = await api.app.inject({ method: 'GET', url: `/api/dashboards/${doc.id}` });
    expect(response.statusCode).toBe(404);
    expect(errorCode(response.json())).toBe('not_found');
    expect((await api.postWidget(doc.id, { config: { type: 'kpi' } })).statusCode).toBe(404);
  });

  it('counts rows grouped by status group and honours view filters', async () => {
    const { databaseId, statusId, viewId } = await taskDatabase();
    const dashboard = await api.createDashboard();
    const widget = await api.addWidget(dashboard.id, {
      type: 'pie',
      databaseId,
      groupByPropertyId: statusId,
      groupByStatusGroup: true,
    });
    const data = await api.widgetData(widget.id);
    expect(data.total).toBe(4);
    expect(data.buckets.map((b) => b.value)).toEqual([1, 1, 2]);

    await api.patchView(viewId, {
      config: { filters: [{ propertyId: statusId, operator: 'in_group', value: 'complete' }] },
    });
    const patched = await api.patchWidget(widget.id, { config: { ...widget.config, viewId } });
    expect(patched.statusCode).toBe(200);
    const filtered = await api.widgetData(widget.id);
    expect(filtered.total).toBe(2);
    expect(filtered.buckets.map((b) => b.value)).toEqual([0, 0, 2]);
  });

  it('rejects configs whose sources do not fit', async () => {
    const { databaseId, statusId } = await taskDatabase();
    const other = await api.createDatabase('Other');
    const otherView = (await api.database(other.id)).views[0]?.id ?? '';
    const dashboard = await api.createDashboard();
    const badConfigs = [
      { type: 'kpi', databaseId: dashboard.id },
      { type: 'kpi', databaseId, viewId: otherView },
      { type: 'kpi', databaseId, metric: 'sum', metricPropertyId: statusId },
      { type: 'bar', databaseId, groupByPropertyId: crypto.randomUUID() },
    ];
    for (const config of badConfigs) {
      const response = await api.postWidget(dashboard.id, { config });
      expect(response.statusCode).toBe(400);
    }
    expect(api.widgetCount()).toBe(0);
  });

  it('reports source_missing when the property or database goes away later', async () => {
    const { databaseId, statusId } = await taskDatabase();
    const dashboard = await api.createDashboard();
    const chart = await api.addWidget(dashboard.id, {
      type: 'bar',
      databaseId,
      groupByPropertyId: statusId,
    });
    const kpi = await api.addWidget(dashboard.id, { type: 'kpi', databaseId });

    expect((await api.deleteProperty(statusId)).statusCode).toBe(204);
    expect((await api.widgetData(chart.id)).state).toBe('source_missing');
    expect((await api.widgetData(kpi.id)).total).toBe(4);

    expect((await api.remove(databaseId)).statusCode).toBe(204);
    expect(await api.widgetData(kpi.id)).toEqual({
      state: 'source_missing',
      total: null,
      buckets: [],
    });
  });

  it('saves several layouts at once and validates them', async () => {
    const dashboard = await api.createDashboard();
    const a = await api.addWidget(dashboard.id, { type: 'kpi' });
    const b = await api.addWidget(dashboard.id, { type: 'kpi' });
    const response = await api.putLayout(dashboard.id, {
      items: [
        { id: a.id, layout: { x: 3, y: 0, w: 3, h: 2 } },
        { id: b.id, layout: { x: 0, y: 0, w: 3, h: 2 } },
      ],
    });
    expect(response.statusCode).toBe(200);
    const detail = dashboardDetailSchema.parse(response.json());
    expect(detail.widgets.map((widget) => widget.layout.x)).toEqual([3, 0]);

    const tooWide = await api.patchWidget(a.id, { layout: { x: 8, y: 0, w: 6, h: 2 } });
    expect(tooWide.statusCode).toBe(400);
    const other = await api.createDashboard('Other');
    const foreign = await api.putLayout(other.id, {
      items: [{ id: a.id, layout: { x: 0, y: 0, w: 3, h: 2 } }],
    });
    expect(foreign.statusCode).toBe(400);
  });

  it('updates a title and deletes widgets', async () => {
    const dashboard = await api.createDashboard();
    const widget = await api.addWidget(dashboard.id, { type: 'kpi' });
    const renamed = await api.patchWidget(widget.id, {
      config: { ...widget.config, title: 'Open tasks' },
    });
    expect(dashboardWidgetSchema.parse(renamed.json()).config.title).toBe('Open tasks');
    expect((await api.patchWidget(widget.id, {})).statusCode).toBe(400);
    expect((await api.deleteWidget(widget.id)).statusCode).toBe(204);
    expect((await api.deleteWidget(widget.id)).statusCode).toBe(404);
  });

  it('does not allow subpages and deletes widgets with the dashboard forever', async () => {
    const dashboard = await api.createDashboard();
    await api.addWidget(dashboard.id, { type: 'kpi' });
    await expect(api.create('Child', dashboard.id)).rejects.toThrow(/subpages/);
    const doc = await api.create('Doc');
    expect((await api.move(doc.id, { parentId: dashboard.id })).statusCode).toBe(409);

    expect((await api.remove(dashboard.id)).statusCode).toBe(204);
    expect(api.widgetCount()).toBe(1);
    expect((await api.purge(dashboard.id)).statusCode).toBe(204);
    expect(api.widgetCount()).toBe(0);
  });
});
