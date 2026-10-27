import {
  type DashboardDetail,
  type DashboardWidget,
  type PageDetail,
  type WidgetData,
  dashboardDetailSchema,
  dashboardWidgetSchema,
  pageDetailSchema,
  widgetDataSchema,
} from '@notiz/shared';
import type { LightMyRequestResponse } from 'fastify';
import { DatabaseApi } from './databaseApi.js';

function expectOk(response: LightMyRequestResponse, status: number): unknown {
  if (response.statusCode !== status) {
    throw new Error(
      `expected ${String(status)}, got ${String(response.statusCode)}: ${response.body}`,
    );
  }
  return response.json();
}

/** Typed helpers for the dashboard and widget endpoints. */
export class DashboardApi extends DatabaseApi {
  async createDashboard(title = 'Overview'): Promise<PageDetail> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title, kind: 'dashboard' },
    });
    return pageDetailSchema.parse(expectOk(response, 201));
  }

  async dashboard(id: string): Promise<DashboardDetail> {
    const response = await this.app.inject({ method: 'GET', url: `/api/dashboards/${id}` });
    return dashboardDetailSchema.parse(expectOk(response, 200));
  }

  postWidget(dashboardId: string, payload: object): Promise<LightMyRequestResponse> {
    return this.app.inject({
      method: 'POST',
      url: `/api/dashboards/${dashboardId}/widgets`,
      payload,
    });
  }

  async addWidget(dashboardId: string, config: object): Promise<DashboardWidget> {
    const response = await this.postWidget(dashboardId, { config });
    return dashboardWidgetSchema.parse(expectOk(response, 201));
  }

  patchWidget(id: string, payload: object): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'PATCH', url: `/api/widgets/${id}`, payload });
  }

  deleteWidget(id: string): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'DELETE', url: `/api/widgets/${id}` });
  }

  putLayout(dashboardId: string, payload: object): Promise<LightMyRequestResponse> {
    return this.app.inject({
      method: 'PUT',
      url: `/api/dashboards/${dashboardId}/layout`,
      payload,
    });
  }

  async widgetData(id: string): Promise<WidgetData> {
    const response = await this.app.inject({ method: 'GET', url: `/api/widgets/${id}/data` });
    return widgetDataSchema.parse(expectOk(response, 200));
  }

  widgetCount(): number {
    return (
      this.db.$client
        .prepare<[], { n: number }>('select count(*) as n from dashboard_widgets')
        .get()?.n ?? 0
    );
  }
}
