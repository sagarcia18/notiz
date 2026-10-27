import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  type DatabaseDetail,
  databaseAggregateResultSchema,
  databaseDetailSchema,
  databaseQueryResultSchema,
  filterOperatorSchema,
  pageIdSchema,
  widgetMetricSchema,
} from '@notiz/shared';
import { z } from 'zod';
import type { NotizApi } from '../apiClient.js';
import { resolveFilters, resolveProperty, resolveSorts, toNamedRows } from '../queryNames.js';
import { runTool } from '../toolResult.js';

const filterSchema = z.object({
  property: z.string().min(1).describe('Property name (case-insensitive) or id'),
  operator: filterOperatorSchema,
  value: z
    .union([z.string().max(2000), z.number()])
    .optional()
    .describe(
      'Compared value. select/status equals/not_equals: option name; in_group: todo, ' +
        'in_progress or complete; date: "YYYY-MM-DD". Not used by is_empty, ' +
        'is_not_empty, is_checked, is_not_checked.',
    ),
});

const FILTER_HELP =
  'Filters are ANDed. Operators by type: text/title/url contains, not_contains, equals, ' +
  'not_equals, is_empty, is_not_empty; number/date equals, not_equals, gt, gte, lt, lte, ' +
  'is_empty, is_not_empty; select equals, not_equals, is_empty, is_not_empty; status the ' +
  'same plus in_group; checkbox is_checked, is_not_checked.';

function databasePath(id: string): string {
  return `/api/databases/${encodeURIComponent(id)}`;
}

function loadDatabase(api: NotizApi, id: string): Promise<DatabaseDetail> {
  return api.get(databasePath(id), databaseDetailSchema);
}

export function registerQueryTools(server: McpServer, api: NotizApi): void {
  server.registerTool(
    'query_database',
    {
      title: 'Query database',
      description:
        'Ad-hoc query over the rows of a database, without a saved view: filter, sort, ' +
        'page and pick columns. Properties and options are given by name. Rows come back ' +
        `keyed by property name with option names; total counts all matches. ${FILTER_HELP}`,
      inputSchema: {
        databaseId: pageIdSchema,
        filters: z.array(filterSchema).max(50).optional(),
        sorts: z
          .array(z.object({ property: z.string().min(1), direction: z.enum(['asc', 'desc']) }))
          .max(10)
          .optional(),
        columns: z
          .array(z.string().min(1))
          .optional()
          .describe('Property names to return; all when omitted'),
        limit: z.number().int().min(1).max(500).optional().describe('Default 100'),
        offset: z.number().int().min(0).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ databaseId, filters, sorts, columns, limit, offset }) =>
      runTool(async () => {
        const database = await loadDatabase(api, databaseId);
        const shown =
          columns === undefined
            ? database.properties
            : columns.map((column) => resolveProperty(database, column));
        const result = await api.post(
          `${databasePath(databaseId)}/query`,
          {
            filters: resolveFilters(database, filters),
            sorts: resolveSorts(database, sorts),
            limit,
            offset,
          },
          databaseQueryResultSchema,
        );
        return {
          total: result.total,
          returned: result.rows.length,
          rows: toNamedRows(shown, result.rows),
        };
      }),
  );

  server.registerTool(
    'aggregate_database',
    {
      title: 'Aggregate database',
      description:
        'Count rows, or sum / average a number property, over the filtered rows of a ' +
        'database, optionally grouped by a select or status property (or by status group: ' +
        `todo, in progress, complete). Same numbers as dashboard widgets. ${FILTER_HELP}`,
      inputSchema: {
        databaseId: pageIdSchema,
        filters: z.array(filterSchema).max(50).optional(),
        metric: widgetMetricSchema.optional().describe('count (default), sum or avg'),
        property: z.string().min(1).optional().describe('Number property for sum/avg'),
        groupBy: z.string().min(1).optional().describe('Select or status property'),
        byStatusGroup: z.boolean().optional().describe('Group a status property by its groups'),
      },
      annotations: { readOnlyHint: true },
    },
    ({ databaseId, filters, metric = 'count', property, groupBy, byStatusGroup }) =>
      runTool(async () => {
        const database = await loadDatabase(api, databaseId);
        const result = await api.post(
          `${databasePath(databaseId)}/aggregate`,
          {
            filters: resolveFilters(database, filters),
            metric,
            metricPropertyId:
              property === undefined ? null : resolveProperty(database, property).id,
            groupByPropertyId: groupBy === undefined ? null : resolveProperty(database, groupBy).id,
            groupByStatusGroup: byStatusGroup ?? false,
          },
          databaseAggregateResultSchema,
        );
        return {
          metric,
          total: result.total,
          groups: result.buckets.map(({ label, value }) => ({ label, value })),
        };
      }),
  );
}
