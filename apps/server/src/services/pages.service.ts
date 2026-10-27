import { randomUUID } from 'node:crypto';
import {
  type CreatePageInput,
  DEFAULT_BPMN_XML,
  type MovePageInput,
  type PageContent,
  type PageDetail,
  type PageKind,
  type PageSummary,
  type PageTreeNode,
  type PropertyValues,
  type UpdatePageInput,
  extractBpmnText,
  extractPlainText,
  pageContentSchema,
  sortKeyBetween,
} from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';
import * as repo from '../repositories/pages.repository.js';
import type { PageRow } from '../repositories/pages.repository.js';
import { parseValues } from './databaseJson.js';
import { initDatabase } from './databaseSetup.js';
import { mergeRowValues } from './rowValues.js';

export function toSummary(row: PageRow): PageSummary {
  return {
    id: row.id,
    parentId: row.parentId,
    kind: row.kind,
    title: row.title,
    icon: row.icon,
    sortOrder: row.sortOrder,
  };
}

function parseContent(json: string | null): PageContent {
  return json === null ? [] : pageContentSchema.parse(JSON.parse(json) as unknown);
}

/** The id of the database the page is a row of, or null. */
function databaseIdOf(db: AppDatabase, row: PageRow): string | null {
  const parent = row.parentId === null ? undefined : repo.findPage(db, row.parentId);
  return parent?.kind === 'database' ? parent.id : null;
}

function toDetail(db: AppDatabase, row: PageRow): PageDetail {
  const databaseId = databaseIdOf(db, row);
  return {
    ...toSummary(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    content: parseContent(row.contentJson),
    databaseId,
    properties: databaseId === null ? {} : parseValues(row.propertiesJson),
    diagram: row.kind === 'bpmn' ? (row.diagramXml ?? DEFAULT_BPMN_XML) : null,
  };
}

/** Builds the nested tree from pages already sorted by sort order. */
export function buildPageTree(summaries: PageSummary[]): PageTreeNode[] {
  const nodes = new Map<string, PageTreeNode>();
  for (const summary of summaries) {
    nodes.set(summary.id, { ...summary, children: [] });
  }
  const roots: PageTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    } else if (node.parentId === null) {
      roots.push(node);
    }
  }
  return roots;
}

export function requireActivePage(db: AppDatabase, id: string): PageRow {
  const row = repo.findPage(db, id);
  if (!row || row.deletedAt !== null) {
    throw new NotFoundError('Page', id);
  }
  return row;
}

function lastChildKey(db: AppDatabase, parentId: string | null): string | null {
  const siblings = repo.listActiveChildren(db, parentId);
  return siblings.at(-1)?.sortOrder ?? null;
}

export function getPageTree(db: AppDatabase): PageTreeNode[] {
  return buildPageTree(repo.listActivePages(db).map(toSummary));
}

export function getPage(db: AppDatabase, id: string): PageDetail {
  return toDetail(db, requireActivePage(db, id));
}

export function createPage(db: AppDatabase, input: CreatePageInput): PageDetail {
  const parentId = input.parentId ?? null;
  return db.transaction(() => {
    const parentKind = parentId === null ? null : requireActivePage(db, parentId).kind;
    if (parentKind === 'database') {
      throw new ConflictError('Database rows are created through the database');
    }
    assertCanHaveSubpages(parentKind);
    const kind = input.kind ?? 'doc';
    const row = repo.insertPage(db, {
      id: randomUUID(),
      parentId,
      kind,
      title: input.title ?? '',
      sortOrder: sortKeyBetween(lastChildKey(db, parentId), null),
      diagramXml: kind === 'bpmn' ? DEFAULT_BPMN_XML : undefined,
    });
    repo.insertSearchEntry(db, row.id, row.title);
    if (row.kind === 'database') {
      initDatabase(db, row.id);
    }
    return toDetail(db, row);
  });
}

export function updatePage(db: AppDatabase, id: string, input: UpdatePageInput): PageDetail {
  return db.transaction(() => {
    const current = requireActivePage(db, id);
    const { content, properties, diagram, ...fields } = input;
    assertFitsKind(current, input);
    const contentJson = content === undefined ? undefined : JSON.stringify(content);
    const propertiesJson =
      properties === undefined ? undefined : rowValuesJson(db, current, properties);
    const row = repo.updatePage(db, id, {
      ...fields,
      contentJson,
      propertiesJson,
      diagramXml: diagram,
    });
    if (input.title !== undefined) {
      repo.updateSearchTitle(db, id, input.title);
    }
    if (content !== undefined) {
      repo.updateSearchBody(db, id, extractPlainText(content));
    }
    if (diagram !== undefined) {
      repo.updateSearchBody(db, id, extractBpmnText(diagram));
    }
    return toDetail(db, row);
  });
}

/** Dashboards and diagrams hold widgets or a canvas instead of subpages. */
function assertCanHaveSubpages(parentKind: PageKind | null): void {
  if (parentKind === 'dashboard') {
    throw new ConflictError('Dashboards cannot have subpages');
  }
  if (parentKind === 'bpmn') {
    throw new ConflictError('Diagrams cannot have subpages');
  }
}

/** A diagram page has no block content, and only diagram pages take a diagram. */
function assertFitsKind(row: PageRow, input: UpdatePageInput): void {
  if (input.diagram !== undefined && row.kind !== 'bpmn') {
    throw new ValidationError('Only diagram pages have a diagram');
  }
  if (input.content !== undefined && row.kind === 'bpmn') {
    throw new ValidationError('Diagram pages have no block content');
  }
}

function rowValuesJson(db: AppDatabase, row: PageRow, values: PropertyValues): string {
  const databaseId = databaseIdOf(db, row);
  if (databaseId === null) {
    throw new ValidationError('Only database rows have properties');
  }
  return mergeRowValues(db, databaseId, row.propertiesJson, values);
}

function sortKeyForMove(siblings: PageRow[], input: MovePageInput): string {
  const anchorId = input.beforeId ?? input.afterId;
  let index = siblings.length;
  if (anchorId !== undefined) {
    const anchorIndex = siblings.findIndex((sibling) => sibling.id === anchorId);
    if (anchorIndex < 0) {
      throw new ConflictError(`Page ${anchorId} is not a sibling under the target parent`);
    }
    index = input.afterId === undefined ? anchorIndex : anchorIndex + 1;
  }
  const before = siblings[index - 1]?.sortOrder ?? null;
  const after = siblings[index]?.sortOrder ?? null;
  return sortKeyBetween(before, after);
}

export function movePage(db: AppDatabase, id: string, input: MovePageInput): PageSummary {
  return db.transaction(() => {
    const page = requireActivePage(db, id);
    if (input.parentId !== null) {
      const parent = requireActivePage(db, input.parentId);
      if (parent.kind === 'database' && page.parentId !== parent.id) {
        throw new ConflictError('Pages cannot be moved into a database');
      }
      assertCanHaveSubpages(parent.kind);
      if (repo.isSelfOrAncestor(db, id, input.parentId)) {
        throw new ConflictError('A page cannot be moved into itself or one of its subpages');
      }
    }
    const siblings = repo
      .listActiveChildren(db, input.parentId)
      .filter((sibling) => sibling.id !== id);
    const sortOrder = sortKeyForMove(siblings, input);
    return toSummary(repo.updatePage(db, id, { parentId: input.parentId, sortOrder }));
  });
}
