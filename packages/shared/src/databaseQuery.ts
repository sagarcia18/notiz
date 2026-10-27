import { z } from 'zod';
import { widgetBucketSchema, widgetMetricSchema } from './dashboards.js';
import { databaseRowSchema, propertyIdSchema } from './databases.js';
import { viewFilterSchema, viewSortSchema } from './views.js';

export const MAX_QUERY_LIMIT = 500;

const filtersSchema = z.array(viewFilterSchema).max(50).default([]);

/**
 * Ad-hoc query over a database's active rows, without a saved view. Filters use the
 * view filter format and are ANDed; unknown properties or unfit operators are rejected.
 */
export const databaseQueryInputSchema = z.object({
  filters: filtersSchema,
  sorts: z.array(viewSortSchema).max(10).default([]),
  limit: z.number().int().min(1).max(MAX_QUERY_LIMIT).default(100),
  offset: z.number().int().min(0).default(0),
});

export type DatabaseQueryInput = z.input<typeof databaseQueryInputSchema>;
/** Validated query with defaults applied. */
export type DatabaseQuery = z.infer<typeof databaseQueryInputSchema>;

export const databaseQueryResultSchema = z.object({
  /** Matching rows before limit/offset. */
  total: z.number().int(),
  rows: z.array(databaseRowSchema),
});

export type DatabaseQueryResult = z.infer<typeof databaseQueryResultSchema>;

/** Count, sum or average of the filtered rows, optionally grouped like a dashboard widget. */
export const databaseAggregateInputSchema = z.object({
  filters: filtersSchema,
  metric: widgetMetricSchema.default('count'),
  /** Number property for sum/avg. */
  metricPropertyId: propertyIdSchema.nullable().default(null),
  /** Select or status property to group by. */
  groupByPropertyId: propertyIdSchema.nullable().default(null),
  groupByStatusGroup: z.boolean().default(false),
});

export type DatabaseAggregateInput = z.input<typeof databaseAggregateInputSchema>;
/** Validated aggregation with defaults applied. */
export type DatabaseAggregate = z.infer<typeof databaseAggregateInputSchema>;

export const databaseAggregateResultSchema = z.object({
  /** Null for an average without any numbers. */
  total: z.number().nullable(),
  /** Empty without grouping. */
  buckets: z.array(widgetBucketSchema),
});

export type DatabaseAggregateResult = z.infer<typeof databaseAggregateResultSchema>;
