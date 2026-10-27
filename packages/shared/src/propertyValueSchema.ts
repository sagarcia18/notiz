import { z } from 'zod';

/**
 * Stored property values: option ids for select/status, a list of option ids
 * for multi_select, `YYYY-MM-DD` for dates.
 */
export const propertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string().min(1).max(64)).max(200),
  z.null(),
]);

export type PropertyValue = z.infer<typeof propertyValueSchema>;

export const propertyValuesSchema = z.record(z.string(), propertyValueSchema);

export type PropertyValues = z.infer<typeof propertyValuesSchema>;
