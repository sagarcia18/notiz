import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  createPropertyInputSchema,
  databaseDetailSchema,
  databasePropertySchema,
  databaseRowListSchema,
  databaseRowSchema,
  pageDetailSchema,
  pageIdSchema,
  propertyValuesSchema,
  viewIdSchema,
} from '@notiz/shared';
import { z } from 'zod';
import { type NotizApi, NotizApiError } from '../apiClient.js';
import { runTool } from '../toolResult.js';

const VALUES_HELP =
  'Values keyed by property id (see get_database): text/url as string, number, checkbox as ' +
  'boolean, date as "YYYY-MM-DD", select/status as the option id; null clears a value.';

function databasePath(id: string): string {
  return `/api/databases/${encodeURIComponent(id)}`;
}

async function listRows(api: NotizApi, databaseId: string, viewId: string | undefined) {
  const database = await api.get(databasePath(databaseId), databaseDetailSchema);
  const view =
    viewId === undefined ? database.views[0] : database.views.find((v) => v.id === viewId);
  if (!view) throw new NotizApiError('not_found', 'View not found in this database');
  const rows = await api.get(
    `/api/views/${encodeURIComponent(view.id)}/rows`,
    databaseRowListSchema,
  );
  return {
    view: { id: view.id, name: view.name, type: view.type },
    properties: database.properties.map(({ id, name, type, options }) => ({
      id,
      name,
      type,
      options,
    })),
    rows,
  };
}

export function registerDatabaseTools(server: McpServer, api: NotizApi): void {
  server.registerTool(
    'get_database',
    {
      title: 'Get database',
      description:
        'Properties (id, name, type, select/status options with ids) and views of a ' +
        'database page. Needed to read and write row values, which are keyed by property id.',
      inputSchema: { databaseId: pageIdSchema },
      annotations: { readOnlyHint: true },
    },
    ({ databaseId }) => runTool(() => api.get(databasePath(databaseId), databaseDetailSchema)),
  );

  server.registerTool(
    'list_database_rows',
    {
      title: 'List database rows',
      description:
        'Rows of a database as shown in one view (its filters and sorts apply), together ' +
        'with the property list. Uses the first view when viewId is omitted.',
      inputSchema: { databaseId: pageIdSchema, viewId: viewIdSchema.optional() },
      annotations: { readOnlyHint: true },
    },
    ({ databaseId, viewId }) => runTool(() => listRows(api, databaseId, viewId)),
  );

  server.registerTool(
    'create_database_row',
    {
      title: 'Create database row',
      description: `Adds a row (a page) to a database. ${VALUES_HELP}`,
      inputSchema: {
        databaseId: pageIdSchema,
        title: z.string().max(500).optional().describe('Row title'),
        properties: propertyValuesSchema.optional(),
      },
    },
    ({ databaseId, title, properties }) =>
      runTool(() =>
        api.post(`${databasePath(databaseId)}/rows`, { title, properties }, databaseRowSchema),
      ),
  );

  server.registerTool(
    'update_database_row',
    {
      title: 'Update database row',
      description: `Merges values into a row; other values stay. ${VALUES_HELP}`,
      inputSchema: { rowId: pageIdSchema, properties: propertyValuesSchema },
    },
    ({ rowId, properties }) =>
      runTool(() =>
        api.patch(`/api/pages/${encodeURIComponent(rowId)}`, { properties }, pageDetailSchema),
      ),
  );

  server.registerTool(
    'add_database_property',
    {
      title: 'Add database property',
      description:
        'Adds a column to a database: type text, number, select, status, date, checkbox or ' +
        'url; select/status may get options ({ name, color, group? }).',
      inputSchema: { databaseId: pageIdSchema, ...createPropertyInputSchema.shape },
    },
    ({ databaseId, ...input }) =>
      runTool(() =>
        api.post(`${databasePath(databaseId)}/properties`, input, databasePropertySchema),
      ),
  );
}
