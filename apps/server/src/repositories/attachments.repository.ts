import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { attachments } from '../db/schema.js';

export type AttachmentRow = typeof attachments.$inferSelect;

export type NewAttachmentRow = Omit<AttachmentRow, 'createdAt'>;

export function insertAttachment(db: AppDatabase, row: NewAttachmentRow): AttachmentRow {
  return db.insert(attachments).values(row).returning().get();
}

export function findAttachment(db: AppDatabase, id: string): AttachmentRow | undefined {
  return db.select().from(attachments).where(eq(attachments.id, id)).get();
}
