import type { DiagramLinkRef } from '@notiz/shared';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../db/client.js';
import { diagramLinks, pages } from '../db/schema.js';

export interface DiagramUsageRow {
  diagramId: string;
  title: string;
  icon: string | null;
}

/** Replaces the stored links of one diagram with `links`. */
export function replaceDiagramLinks(
  db: AppDatabase,
  diagramId: string,
  links: readonly DiagramLinkRef[],
): void {
  db.delete(diagramLinks).where(eq(diagramLinks.diagramId, diagramId)).run();
  if (links.length > 0) {
    db.insert(diagramLinks)
      .values(links.map((link) => ({ diagramId, ...link })))
      .run();
  }
}

/** Active diagrams with at least one element linked to `pageId`, one entry per diagram. */
export function listDiagramUsages(db: AppDatabase, pageId: string): DiagramUsageRow[] {
  return db
    .selectDistinct({ diagramId: pages.id, title: pages.title, icon: pages.icon })
    .from(diagramLinks)
    .innerJoin(pages, eq(pages.id, diagramLinks.diagramId))
    .where(and(eq(diagramLinks.pageId, pageId), isNull(pages.deletedAt)))
    .orderBy(asc(pages.title), asc(pages.id))
    .all();
}

export function listDiagramSources(db: AppDatabase): { id: string; diagramXml: string | null }[] {
  return db
    .select({ id: pages.id, diagramXml: pages.diagramXml })
    .from(pages)
    .where(eq(pages.kind, 'bpmn'))
    .all();
}
