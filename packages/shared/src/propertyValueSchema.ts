import { z } from 'zod';

/** Stored property values: option ids for select/status, `YYYY-MM-DD` for dates. */
export const propertyValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export type PropertyValue = z.infer<typeof propertyValueSchema>;

export const propertyValuesSchema = z.record(z.string(), propertyValueSchema);

export type PropertyValues = z.infer<typeof propertyValuesSchema>;
