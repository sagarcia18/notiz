import { z } from 'zod';
import { decodeXmlEntities } from './bpmn.js';
import { propertyOptionSchema } from './databases.js';

/** XML namespace of the Notiz extension attributes in BPMN files (prefix `notiz`). */
export const NOTIZ_BPMN_NAMESPACE = 'http://notiz.local/schema/bpmn/1.0';

export interface DiagramLinkRef {
  elementId: string;
  pageId: string;
}

const linkedStartTagPattern = /<[\w.:-]+\s[^>]*\bnotiz:pageId\s*=\s*"[^"]*"[^>]*>/g;
const elementIdPattern = /\sid\s*=\s*"([^"]*)"/;
const pageIdAttributePattern = /\bnotiz:pageId\s*=\s*"([^"]*)"/;

/** Elements that carry a `notiz:pageId` link, in document order. */
export function extractDiagramLinks(xml: string): DiagramLinkRef[] {
  const links: DiagramLinkRef[] = [];
  for (const [tag] of xml.matchAll(linkedStartTagPattern)) {
    const elementId = elementIdPattern.exec(tag)?.[1];
    const pageId = pageIdAttributePattern.exec(tag)?.[1];
    if (elementId && pageId) {
      links.push({ elementId: decodeXmlEntities(elementId), pageId: decodeXmlEntities(pageId) });
    }
  }
  return links;
}

/** A diagram element linked to a page, resolved for display. */
export const diagramLinkSchema = z.object({
  elementId: z.string(),
  pageId: z.string(),
  /** `missing`: the page is trashed, deleted or the id is invalid. */
  state: z.enum(['ok', 'missing']),
  title: z.string(),
  icon: z.string().nullable(),
  /** Value of the first status property when the page is a database row. */
  status: propertyOptionSchema.nullable(),
});

export type DiagramLink = z.infer<typeof diagramLinkSchema>;

export const diagramLinkListSchema = z.array(diagramLinkSchema);

/** A diagram that links to a page ("used in diagrams"). */
export const diagramUsageSchema = z.object({
  diagramId: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
});

export type DiagramUsage = z.infer<typeof diagramUsageSchema>;

export const diagramUsageListSchema = z.array(diagramUsageSchema);
