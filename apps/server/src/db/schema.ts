import { sql } from 'drizzle-orm';
import { type AnySQLiteColumn, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const pages = sqliteTable(
  'pages',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id').references((): AnySQLiteColumn => pages.id),
    kind: text('kind', { enum: ['doc', 'database', 'dashboard'] })
      .notNull()
      .default('doc'),
    title: text('title').notNull().default(''),
    icon: text('icon'),
    sortOrder: text('sort_order').notNull(),
    contentJson: text('content_json'),
    propertiesJson: text('properties_json'),
    isTemplate: integer('is_template', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    deletedAt: text('deleted_at'),
  },
  (table) => [index('pages_parent_sort_idx').on(table.parentId, table.sortOrder)],
);

export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    pageId: text('page_id')
      .notNull()
      .references(() => pages.id),
    fileName: text('file_name').notNull(),
    storedPath: text('stored_path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [index('attachments_page_idx').on(table.pageId)],
);
