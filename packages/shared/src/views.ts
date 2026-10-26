import { z } from 'zod';
import {
  type PropertyType,
  databasePropertySchema,
  propertyIdSchema,
  viewIdSchema,
} from './databases.js';
import { pageIdSchema } from './pages.js';

export const viewTypeSchema = z.enum(['table', 'board']);

export type ViewType = z.infer<typeof viewTypeSchema>;

export const filterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
  'is_checked',
  'is_not_checked',
  'in_group',
]);

export type FilterOperator = z.infer<typeof filterOperatorSchema>;

const textOperators: FilterOperator[] = [
  'contains',
  'not_contains',
  'equals',
  'not_equals',
  'is_empty',
  'is_not_empty',
];
const comparisonOperators: FilterOperator[] = [
  'equals',
  'not_equals',
  'gt',
  'gte',
  'lt',
  'lte',
  'is_empty',
  'is_not_empty',
];
const choiceOperators: FilterOperator[] = ['equals', 'not_equals', 'is_empty', 'is_not_empty'];

/** Operators that make sense for each property type; others are ignored when filtering. */
export const operatorsByType: Record<PropertyType, FilterOperator[]> = {
  title: textOperators,
  text: textOperators,
  url: textOperators,
  number: comparisonOperators,
  date: comparisonOperators,
  select: choiceOperators,
  status: [...choiceOperators, 'in_group'],
  checkbox: ['is_checked', 'is_not_checked'],
};

/** Operators that compare against `value`; the rest ignore it. */
export function operatorNeedsValue(operator: FilterOperator): boolean {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked'].includes(operator);
}

export const viewFilterSchema = z.object({
  propertyId: propertyIdSchema,
  operator: filterOperatorSchema,
  value: z.union([z.string().max(2000), z.number()]).optional(),
});

export type ViewFilter = z.infer<typeof viewFilterSchema>;

export const viewSortSchema = z.object({
  propertyId: propertyIdSchema,
  direction: z.enum(['asc', 'desc']),
});

export type ViewSort = z.infer<typeof viewSortSchema>;

export const viewColumnSchema = z.object({
  propertyId: propertyIdSchema,
  width: z.number().int().min(60).max(1200).optional(),
  hidden: z.boolean().optional(),
});

export type ViewColumn = z.infer<typeof viewColumnSchema>;

/**
 * One config shape for all view types. All filters must match. `columns`
 * orders and hides table columns (unlisted properties follow in property
 * order); `groupByPropertyId` and `cardPropertyIds` drive the board.
 */
export const viewConfigSchema = z.object({
  filters: z.array(viewFilterSchema).max(50).default([]),
  sorts: z.array(viewSortSchema).max(10).default([]),
  columns: z.array(viewColumnSchema).max(200).default([]),
  groupByPropertyId: propertyIdSchema.nullable().default(null),
  cardPropertyIds: z.array(propertyIdSchema).max(200).default([]),
});

export type ViewConfig = z.infer<typeof viewConfigSchema>;

export const databaseViewSchema = z.object({
  id: viewIdSchema,
  databaseId: pageIdSchema,
  type: viewTypeSchema,
  name: z.string(),
  config: viewConfigSchema,
  sortOrder: z.string(),
});

export type DatabaseView = z.infer<typeof databaseViewSchema>;

const viewNameSchema = z.string().trim().min(1).max(100);

export const createViewInputSchema = z.object({
  type: viewTypeSchema,
  name: viewNameSchema.optional(),
});

export type CreateViewInput = z.infer<typeof createViewInputSchema>;

export const updateViewInputSchema = z
  .object({
    name: viewNameSchema.optional(),
    config: viewConfigSchema.optional(),
  })
  .refine((input) => input.name !== undefined || input.config !== undefined, {
    message: 'Nothing to update',
  });

export type UpdateViewInput = z.input<typeof updateViewInputSchema>;

export const databaseDetailSchema = z.object({
  id: pageIdSchema,
  properties: z.array(databasePropertySchema),
  views: z.array(databaseViewSchema),
});

export type DatabaseDetail = z.infer<typeof databaseDetailSchema>;
