import {
  type DiagramLink,
  type DiagramLinkRef,
  type PropertyOption,
  extractDiagramLinks,
  pageIdSchema,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import * as databasesRepo from '../repositories/databases.repository.js';
import * as pagesRepo from '../repositories/pages.repository.js';
import type { PageRow } from '../repositories/pages.repository.js';
import { parseOptions, parseValues } from './databaseJson.js';
import { requireActivePage } from './pages.service.js';

interface StatusProperty {
  id: string;
  options: PropertyOption[];
}

/** First status property of each database, looked up once per request. */
type StatusLookup = (databaseId: string) => StatusProperty | undefined;

function statusLookup(db: AppDatabase): StatusLookup {
  const cache = new Map<string, StatusProperty | undefined>();
  return (databaseId) => {
    if (!cache.has(databaseId)) {
      const property = databasesRepo
        .listProperties(db, databaseId)
        .find((candidate) => candidate.type === 'status');
      cache.set(
        databaseId,
        property && { id: property.id, options: parseOptions(property.optionsJson) },
      );
    }
    return cache.get(databaseId);
  };
}

function findActivePage(db: AppDatabase, pageId: string): PageRow | undefined {
  if (!pageIdSchema.safeParse(pageId).success) return undefined;
  const row = pagesRepo.findPage(db, pageId);
  return row && row.deletedAt === null ? row : undefined;
}

function rowStatus(db: AppDatabase, row: PageRow, lookup: StatusLookup): PropertyOption | null {
  const parent = row.parentId === null ? undefined : pagesRepo.findPage(db, row.parentId);
  if (parent?.kind !== 'database') return null;
  const property = lookup(parent.id);
  if (!property) return null;
  const value = parseValues(row.propertiesJson)[property.id];
  return property.options.find((option) => option.id === value) ?? null;
}

function resolveLink(db: AppDatabase, link: DiagramLinkRef, lookup: StatusLookup): DiagramLink {
  const row = findActivePage(db, link.pageId);
  if (!row) {
    return { ...link, state: 'missing', title: '', icon: null, status: null };
  }
  return {
    ...link,
    state: 'ok',
    title: row.title,
    icon: row.icon,
    status: rowStatus(db, row, lookup),
  };
}

/** The pages linked from a diagram's elements, read from the stored XML. */
export function listDiagramLinks(db: AppDatabase, diagramId: string): DiagramLink[] {
  const page = requireActivePage(db, diagramId);
  if (page.kind !== 'bpmn') {
    throw new ValidationError('Only diagram pages have links');
  }
  const lookup = statusLookup(db);
  return extractDiagramLinks(page.diagramXml ?? '').map((link) => resolveLink(db, link, lookup));
}
