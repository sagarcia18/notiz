import {
  type CreatePropertyInput,
  type DatabaseDetail,
  type DatabaseProperty,
  type DatabaseRow,
  type DatabaseView,
  type PageDetail,
  type PropertyValues,
  databaseDetailSchema,
  databasePropertySchema,
  databaseRowListSchema,
  databaseRowSchema,
  databaseViewSchema,
  pageDetailSchema,
} from '@notiz/shared';
import type { LightMyRequestResponse } from 'fastify';
import { PageApi } from './pageApi.js';

function expectStatus(response: LightMyRequestResponse, status: number): unknown {
  if (response.statusCode !== status) {
    throw new Error(
      `expected ${String(status)}, got ${String(response.statusCode)}: ${response.body}`,
    );
  }
  return response.json();
}

/** Typed helpers for the database, property, view and row endpoints. */
export class DatabaseApi extends PageApi {
  async createDatabase(title = 'Tasks'): Promise<PageDetail> {
    const response = await this.app.inject({
      method: 'POST',
      url: '/api/pages',
      payload: { title, kind: 'database' },
    });
    return pageDetailSchema.parse(expectStatus(response, 201));
  }

  async database(id: string): Promise<DatabaseDetail> {
    const response = await this.app.inject({ method: 'GET', url: `/api/databases/${id}` });
    return databaseDetailSchema.parse(expectStatus(response, 200));
  }

  async addProperty(databaseId: string, input: CreatePropertyInput): Promise<DatabaseProperty> {
    const response = await this.app.inject({
      method: 'POST',
      url: `/api/databases/${databaseId}/properties`,
      payload: input,
    });
    return databasePropertySchema.parse(expectStatus(response, 201));
  }

  patchProperty(id: string, payload: object): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'PATCH', url: `/api/properties/${id}`, payload });
  }

  deleteProperty(id: string): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'DELETE', url: `/api/properties/${id}` });
  }

  async addView(databaseId: string, type: 'table' | 'board'): Promise<DatabaseView> {
    const response = await this.app.inject({
      method: 'POST',
      url: `/api/databases/${databaseId}/views`,
      payload: { type },
    });
    return databaseViewSchema.parse(expectStatus(response, 201));
  }

  patchView(id: string, payload: object): Promise<LightMyRequestResponse> {
    return this.app.inject({ method: 'PATCH', url: `/api/views/${id}`, payload });
  }

  async viewRows(viewId: string): Promise<DatabaseRow[]> {
    const response = await this.app.inject({ method: 'GET', url: `/api/views/${viewId}/rows` });
    return databaseRowListSchema.parse(expectStatus(response, 200));
  }

  async addRow(
    databaseId: string,
    title: string,
    properties: PropertyValues = {},
  ): Promise<DatabaseRow> {
    const response = await this.app.inject({
      method: 'POST',
      url: `/api/databases/${databaseId}/rows`,
      payload: { title, properties },
    });
    return databaseRowSchema.parse(expectStatus(response, 201));
  }

  setValues(rowId: string, properties: PropertyValues): Promise<LightMyRequestResponse> {
    return this.app.inject({
      method: 'PATCH',
      url: `/api/pages/${rowId}`,
      payload: { properties },
    });
  }

  async page(id: string): Promise<PageDetail> {
    const response = await this.app.inject({ method: 'GET', url: `/api/pages/${id}` });
    return pageDetailSchema.parse(expectStatus(response, 200));
  }

  tableCount(table: 'db_properties' | 'db_views'): number {
    return (
      this.db.$client.prepare<[], { n: number }>(`select count(*) as n from ${table}`).get()?.n ?? 0
    );
  }
}
