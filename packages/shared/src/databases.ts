import { z } from 'zod';
import { pageIdSchema } from './pages.js';
import { propertyValuesSchema } from './propertyValueSchema.js';

export const propertyTypeSchema = z.enum([
  'title',
  'text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'url',
]);

export type PropertyType = z.infer<typeof propertyTypeSchema>;

/** Types whose values are option ids, so `options` are used. */
export function hasOptions(type: PropertyType): boolean {
  return type === 'select' || type === 'multi_select' || type === 'status';
}

export const optionColorSchema = z.enum([
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
]);

export type OptionColor = z.infer<typeof optionColorSchema>;

/** Status options are grouped so dashboards can count open work. */
export const statusGroupSchema = z.enum(['todo', 'in_progress', 'complete']);

export type StatusGroup = z.infer<typeof statusGroupSchema>;

const optionIdSchema = z.string().min(1).max(64);

/** A choice of a select or status property; `group` is set only for status. */
export const propertyOptionSchema = z.object({
  id: optionIdSchema,
  name: z.string().trim().min(1).max(100),
  color: optionColorSchema,
  group: statusGroupSchema.optional(),
});

export type PropertyOption = z.infer<typeof propertyOptionSchema>;

/** Options sent by the client; new options may come without an id. */
export const propertyOptionInputSchema = propertyOptionSchema.extend({
  id: optionIdSchema.optional(),
});

export type PropertyOptionInput = z.infer<typeof propertyOptionInputSchema>;

export const propertyIdSchema = z.uuid();
export const viewIdSchema = z.uuid();

export const databasePropertySchema = z.object({
  id: propertyIdSchema,
  databaseId: pageIdSchema,
  name: z.string(),
  type: propertyTypeSchema,
  options: z.array(propertyOptionSchema),
  sortOrder: z.string(),
});

export type DatabaseProperty = z.infer<typeof databasePropertySchema>;

const propertyNameSchema = z.string().trim().min(1).max(100);
const optionsInputSchema = z.array(propertyOptionInputSchema).max(200);

export const createPropertyInputSchema = z.object({
  name: propertyNameSchema,
  type: propertyTypeSchema.exclude(['title']),
  options: optionsInputSchema.optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;

export const updatePropertyInputSchema = z
  .object({
    name: propertyNameSchema.optional(),
    type: propertyTypeSchema.exclude(['title']).optional(),
    options: optionsInputSchema.optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.type !== undefined || input.options !== undefined,
    { message: 'Nothing to update' },
  );

export type UpdatePropertyInput = z.infer<typeof updatePropertyInputSchema>;

export const databaseRowSchema = z.object({
  id: pageIdSchema,
  title: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.string(),
  properties: propertyValuesSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DatabaseRow = z.infer<typeof databaseRowSchema>;

export const databaseRowListSchema = z.array(databaseRowSchema);

export const createRowInputSchema = z.object({
  title: z.string().max(500).optional(),
  properties: propertyValuesSchema.optional(),
});

export type CreateRowInput = z.infer<typeof createRowInputSchema>;
