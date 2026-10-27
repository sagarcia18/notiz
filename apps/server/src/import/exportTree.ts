import { parseCsv } from './csv.js';
import {
  baseName,
  dirName,
  extensionOf,
  parseNotionName,
  resolveRelativePath,
  stripExtension,
} from './notionNames.js';
import type { ZipEntries } from './zipEntries.js';

/** A page, database or database row found in a Notion export. */
export interface ExportNode {
  /** Path of the `.md` / `.csv` file; links to it resolve to this node. */
  path: string;
  kind: 'doc' | 'database' | 'row';
  title: string;
  /** Markdown body without the title line (and, for rows, the property lines). */
  markdown: string;
  /** Databases: CSV header and data rows. Rows: their cells. */
  header: string[];
  cells: string[];
  children: ExportNode[];
}

export interface ExportTree {
  roots: ExportNode[];
  /** Every link target (`.md`, `.csv`, `_all.csv`) -> node. */
  nodes: Map<string, ExportNode>;
  files: ZipEntries;
}

const decoder = new TextDecoder('utf-8');
const titleLine = /^#\s+(.+)$/;
const linkTarget = /\]\(([^)\s]+)\)/g;

function text(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function titleOf(path: string): string {
  const title = parseNotionName(stripExtension(baseName(path))).title;
  return title === '' ? 'Untitled' : title;
}

/** Drops the `# Title` line and, for rows, the `Name: value` lines Notion writes below it. */
function splitTitle(
  markdown: string,
  propertyNames: ReadonlySet<string>,
): { title: string | null; body: string } {
  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && (lines[i] ?? '').trim() === '') i += 1;
  const title = titleLine.exec((lines[i] ?? '').trim())?.[1]?.trim() ?? null;
  if (title === null) return { title, body: markdown };
  i += 1;
  if (propertyNames.size > 0) {
    let j = i;
    while (j < lines.length && (lines[j] ?? '').trim() === '') j += 1;
    while (j < lines.length) {
      const name = /^([^:]+):\s/.exec(lines[j] ?? '')?.[1]?.trim();
      if (name === undefined || !propertyNames.has(name)) break;
      j += 1;
      i = j;
    }
  }
  return { title, body: lines.slice(i).join('\n') };
}

function node(path: string, kind: ExportNode['kind'], title: string): ExportNode {
  return { path, kind, title, markdown: '', header: [], cells: [], children: [] };
}

/** Prefer `X_all.csv` (all rows) over `X.csv` (rows of the exported view). */
function databaseFiles(paths: string[]): Map<string, string> {
  const csvByKey = new Map<string, string>();
  for (const path of paths.filter((candidate) => extensionOf(candidate) === 'csv')) {
    const isAll = path.toLowerCase().endsWith('_all.csv');
    const key = isAll ? `${path.slice(0, -'_all.csv'.length)}.csv` : path;
    if (isAll || !csvByKey.has(key)) csvByKey.set(key, path);
  }
  return csvByKey;
}

/** The node owning a folder: the page or database exported next to it, or one further up. */
function ownerOf(folder: string, owners: ReadonlyMap<string, ExportNode>): ExportNode | null {
  let current = folder;
  while (current !== '') {
    const owner = owners.get(current);
    if (owner) return owner;
    current = dirName(current);
  }
  return null;
}

function attachRows(database: ExportNode, rowPages: ExportNode[], rows: string[][]): void {
  const unused = [...rowPages];
  for (const cells of rows) {
    const title = (cells[0] ?? '').trim();
    const index = unused.findIndex((page) => page.title === title);
    const [page] = index >= 0 ? unused.splice(index, 1) : [node(database.path, 'row', title)];
    if (page) {
      page.cells = cells;
      page.title = title === '' ? page.title : title;
      database.children.push(page);
    }
  }
  database.children.push(...unused);
}

function linkOrder(markdown: string, fromDir: string): Map<string, number> {
  const order = new Map<string, number>();
  for (const match of markdown.matchAll(linkTarget)) {
    const target = resolveRelativePath(fromDir, match[1] ?? '');
    if (target !== null && !order.has(target)) order.set(target, order.size);
  }
  return order;
}

function sortChildren(parent: ExportNode | null, children: ExportNode[]): void {
  const order = parent
    ? linkOrder(parent.markdown, dirName(parent.path))
    : new Map<string, number>();
  const rank = (child: ExportNode): number => order.get(child.path) ?? Number.MAX_SAFE_INTEGER;
  children.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

/**
 * Builds the page tree of a Notion "Markdown & CSV" export: `Page.md` with its
 * subpages in the folder `Page/`, databases as `Db.csv` with their row pages in
 * `Db/`. Pages are ordered as their parent links them, the rest by title.
 */
export function buildExportTree(files: ZipEntries): ExportTree {
  const paths = [...files.keys()].sort();
  const nodes = new Map<string, ExportNode>();
  const owners = new Map<string, ExportNode>();
  const databases = new Map<ExportNode, string[][]>();

  for (const [key, csvPath] of databaseFiles(paths)) {
    const database = node(key, 'database', titleOf(key));
    const [header = [], ...rows] = parseCsv(text(files.get(csvPath) ?? new Uint8Array()));
    database.header = header.map((name) => name.trim());
    databases.set(database, rows);
    nodes.set(key, database).set(csvPath, database);
    owners.set(stripExtension(key), database);
  }
  for (const path of paths.filter((candidate) => extensionOf(candidate) === 'md')) {
    const page = node(path, 'doc', titleOf(path));
    page.markdown = text(files.get(path) ?? new Uint8Array());
    nodes.set(path, page);
    owners.set(stripExtension(path), page);
  }

  const roots: ExportNode[] = [];
  const rowPages = new Map<ExportNode, ExportNode[]>();
  for (const current of new Set(nodes.values())) {
    const parent = ownerOf(dirName(current.path), owners);
    const isRow = parent?.kind === 'database' && current.kind === 'doc';
    const names = isRow ? new Set(parent.header) : new Set<string>();
    const { title, body } = splitTitle(current.markdown, names);
    current.markdown = body;
    if (title !== null) current.title = title;
    if (isRow) {
      current.kind = 'row';
      rowPages.set(parent, [...(rowPages.get(parent) ?? []), current]);
    } else if (parent) {
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  }
  for (const [database, rows] of databases) {
    const pages = rowPages.get(database) ?? [];
    sortChildren(null, pages);
    attachRows(database, pages, rows);
  }
  sortChildren(null, roots);
  for (const current of new Set(nodes.values())) {
    if (current.kind !== 'database') sortChildren(current, current.children);
  }
  return { roots, nodes, files };
}
