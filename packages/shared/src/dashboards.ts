import { z } from 'zod';
import { optionColorSchema, propertyIdSchema, viewIdSchema } from './databases.js';
import { pageIdSchema } from './pages.js';

export const widgetIdSchema = z.uuid();

export const widgetTypeSchema = z.enum(['kpi', 'bar', 'pie']);

export type WidgetType = z.infer<typeof widgetTypeSchema>;

export const widgetMetricSchema = z.enum(['count', 'sum', 'avg']);

export type WidgetMetric = z.infer<typeof widgetMetricSchema>;

/**
 * What a widget shows. Rows come from `databaseId`, filtered by the view's
 * filters when `viewId` is set. `sum`/`avg` use the number property
 * `metricPropertyId`. Bar and pie widgets group by a select/status property;
 * `groupByStatusGroup` groups a status property by todo/in progress/complete.
 */
export const widgetConfigSchema = z.object({
  type: widgetTypeSchema,
  title: z.string().trim().max(100).default(''),
  databaseId: pageIdSchema.nullable().default(null),
  viewId: viewIdSchema.nullable().default(null),
  metric: widgetMetricSchema.default('count'),
  metricPropertyId: propertyIdSchema.nullable().default(null),
  groupByPropertyId: propertyIdSchema.nullable().default(null),
  groupByStatusGroup: z.boolean().default(false),
});

export type WidgetConfig = z.infer<typeof widgetConfigSchema>;

export const GRID_COLUMNS = 12;

/** Position and size in grid units (12 columns). */
export const widgetLayoutSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(GRID_COLUMNS - 1),
    y: z.number().int().min(0).max(10_000),
    w: z.number().int().min(1).max(GRID_COLUMNS),
    h: z.number().int().min(1).max(50),
  })
  .refine((layout) => layout.x + layout.w <= GRID_COLUMNS, {
    message: `Widget must fit into ${GRID_COLUMNS} columns`,
  });

export type WidgetLayout = z.infer<typeof widgetLayoutSchema>;

export const dashboardWidgetSchema = z.object({
  id: widgetIdSchema,
  dashboardId: pageIdSchema,
  config: widgetConfigSchema,
  layout: widgetLayoutSchema,
  createdAt: z.string(),
});

export type DashboardWidget = z.infer<typeof dashboardWidgetSchema>;

export const dashboardDetailSchema = z.object({
  id: pageIdSchema,
  widgets: z.array(dashboardWidgetSchema),
});

export type DashboardDetail = z.infer<typeof dashboardDetailSchema>;

export const createWidgetInputSchema = z.object({
  config: widgetConfigSchema,
  layout: widgetLayoutSchema.optional(),
});

export type CreateWidgetInput = z.input<typeof createWidgetInputSchema>;

export const updateWidgetInputSchema = z
  .object({
    config: widgetConfigSchema.optional(),
    layout: widgetLayoutSchema.optional(),
  })
  .refine((input) => input.config !== undefined || input.layout !== undefined, {
    message: 'Nothing to update',
  });

export type UpdateWidgetInput = z.input<typeof updateWidgetInputSchema>;

export const updateDashboardLayoutInputSchema = z.object({
  items: z
    .array(z.object({ id: widgetIdSchema, layout: widgetLayoutSchema }))
    .min(1)
    .max(200),
});

export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutInputSchema>;

/** Bucket key for rows without a value (or with an option that no longer exists). */
export const NO_VALUE_KEY = '__none__';

export const widgetBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  color: optionColorSchema.nullable(),
  /** Null for an average without any numbers. */
  value: z.number().nullable(),
});

export type WidgetBucket = z.infer<typeof widgetBucketSchema>;

/**
 * `unconfigured`: no database chosen yet. `source_missing`: the database,
 * view or a property was deleted or no longer fits the widget.
 */
export const widgetDataSchema = z.object({
  state: z.enum(['ok', 'unconfigured', 'source_missing']),
  total: z.number().nullable(),
  buckets: z.array(widgetBucketSchema),
});

export type WidgetData = z.infer<typeof widgetDataSchema>;
