import { z } from 'zod';
import { pageContentSchema } from './content.js';
import { propertyValuesSchema } from './propertyValueSchema.js';

export const pageKindSchema = z.enum(['doc', 'database', 'dashboard']);

export type PageKind = z.infer<typeof pageKindSchema>;

export const pageIdSchema = z.uuid();

export const pageSummarySchema = z.object({
  id: pageIdSchema,
  parentId: pageIdSchema.nullable(),
  kind: pageKindSchema,
  title: z.string(),
  icon: z.string().nullable(),
  sortOrder: z.string(),
});

export type PageSummary = z.infer<typeof pageSummarySchema>;

export type PageTreeNode = PageSummary & { children: PageTreeNode[] };

export const pageTreeNodeSchema: z.ZodType<PageTreeNode> = pageSummarySchema.extend({
  get children() {
    return z.array(pageTreeNodeSchema);
  },
});

export const pageTreeSchema = z.array(pageTreeNodeSchema);

export const pageDetailSchema = pageSummarySchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
  content: pageContentSchema,
  /** Set when the page is a row of a database page. */
  databaseId: pageIdSchema.nullable(),
  properties: propertyValuesSchema,
});

export type PageDetail = z.infer<typeof pageDetailSchema>;

const titleSchema = z.string().max(500);
const iconSchema = z.string().max(32).nullable();

export const createPageInputSchema = z.object({
  parentId: pageIdSchema.nullable().optional(),
  title: titleSchema.optional(),
  kind: pageKindSchema.optional(),
});

export type CreatePageInput = z.infer<typeof createPageInputSchema>;

export const updatePageInputSchema = z
  .object({
    title: titleSchema.optional(),
    icon: iconSchema.optional(),
    content: pageContentSchema.optional(),
    /** Database rows only: merged into the stored values; `null` clears one. */
    properties: propertyValuesSchema.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'Nothing to update',
  });

export type UpdatePageInput = z.infer<typeof updatePageInputSchema>;

/** Moves a page under `parentId`; without before/after it becomes the last child. */
export const movePageInputSchema = z
  .object({
    parentId: pageIdSchema.nullable(),
    beforeId: pageIdSchema.optional(),
    afterId: pageIdSchema.optional(),
  })
  .refine((input) => input.beforeId === undefined || input.afterId === undefined, {
    message: 'Use either beforeId or afterId, not both',
  });

export type MovePageInput = z.infer<typeof movePageInputSchema>;

export const trashEntrySchema = z.object({
  id: pageIdSchema,
  kind: pageKindSchema,
  title: z.string(),
  icon: z.string().nullable(),
  deletedAt: z.string(),
});

export type TrashEntry = z.infer<typeof trashEntrySchema>;

export const trashListSchema = z.array(trashEntrySchema);
