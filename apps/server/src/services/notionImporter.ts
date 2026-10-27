import { type NotionImportResult, type PropertyValues, attachmentUrl } from '@notiz/shared';
import type { AppDatabase } from '../db/client.js';
import { ValidationError } from '../errors.js';
import type { ExportNode, ExportTree } from '../import/exportTree.js';
import type { MarkdownResolver, ResolvedFile } from '../import/markdownBlocks.js';
import { markdownToBlocks } from '../import/markdownBlocks.js';
import { isImageExtension, mimeForExtension } from '../import/mimeTypes.js';
import { baseName, dirName, extensionOf, resolveRelativePath } from '../import/notionNames.js';
import { type ImportedType, cellToValue, inferColumn } from '../import/propertyInference.js';
import type { AttachmentFiles } from '../storage/attachmentFiles.js';
import { storeAttachmentBytes } from './attachments.service.js';
import { createProperty, getDatabase, updateProperty } from './databases.service.js';
import { createPage, updatePage } from './pages.service.js';
import { createRow } from './rows.service.js';

interface ImportedColumn {
  index: number;
  propertyId: string;
  type: ImportedType;
  optionIds: Map<string, string>;
}

const externalHref = /^(https?:|mailto:)/i;
const MAX_NAME_LENGTH = 100;

function columnName(name: string, index: number): string {
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed === '' ? `Column ${index + 1}` : trimmed;
}

/**
 * Writes one export tree through the page, database, row and attachment
 * services. Must run inside a transaction; `onFileWritten` collects the files
 * written to disk so they can be removed when the transaction fails.
 */
export class NotionImporter {
  private readonly pageIds = new Map<ExportNode, string>();
  private readonly stored = new Map<string, ResolvedFile>();
  private readonly counts = { pages: 0, databases: 0, rows: 0, attachments: 0 };
  private readonly warnings: string[] = [];

  constructor(
    private readonly db: AppDatabase,
    private readonly files: AttachmentFiles,
    private readonly tree: ExportTree,
    private readonly onFileWritten: (storedPath: string) => void,
  ) {}

  run(rootTitle: string): NotionImportResult {
    const root = createPage(this.db, { title: rootTitle });
    for (const node of this.tree.roots) this.createNode(node, root.id);
    for (const [node, pageId] of this.pageIds) this.writeContent(node, pageId);
    return { rootPageId: root.id, ...this.counts, warnings: this.warnings };
  }

  private createNode(node: ExportNode, parentId: string): void {
    if (node.kind === 'database') {
      this.createDatabase(node, parentId);
      return;
    }
    const page = createPage(this.db, { parentId, title: node.title.slice(0, 500) });
    this.pageIds.set(node, page.id);
    this.counts.pages += 1;
    for (const child of node.children) this.createNode(child, page.id);
  }

  private createDatabase(node: ExportNode, parentId: string): void {
    const database = createPage(this.db, {
      parentId,
      title: node.title.slice(0, 500),
      kind: 'database',
    });
    this.pageIds.set(node, database.id);
    this.counts.databases += 1;
    const columns = this.createColumns(node, database.id);
    for (const row of node.children) {
      const created = createRow(this.db, database.id, {
        title: row.title.slice(0, 500),
        properties: this.rowValues(row.cells, columns),
      });
      this.pageIds.set(row, created.id);
      this.counts.rows += 1;
      for (const child of row.children) this.createNode(child, created.id);
    }
  }

  private createColumns(node: ExportNode, databaseId: string): ImportedColumn[] {
    const [titleProperty] = getDatabase(this.db, databaseId).properties;
    const [titleName = '', ...names] = node.header;
    if (titleProperty && titleName.trim() !== '') {
      updateProperty(this.db, titleProperty.id, { name: columnName(titleName, 0) });
    }
    return names.flatMap((name, offset) => {
      const index = offset + 1;
      const values = node.children.map((row) => row.cells[index] ?? '');
      const inferred = inferColumn(columnName(name, index), values);
      if (inferred.note !== null) this.warnings.push(`${node.title}: ${inferred.note}`);
      if (inferred.type === 'skip') return [];
      const property = createProperty(this.db, databaseId, {
        name: inferred.name,
        type: inferred.type,
        options: inferred.options,
      });
      const optionIds = new Map(property.options.map((option) => [option.name, option.id]));
      return [{ index, propertyId: property.id, type: inferred.type, optionIds }];
    });
  }

  private rowValues(cells: string[], columns: ImportedColumn[]): PropertyValues {
    const values: PropertyValues = {};
    for (const column of columns) {
      const value = cellToValue(column.type, cells[column.index] ?? '', column.optionIds);
      if (value !== null) values[column.propertyId] = value;
    }
    return values;
  }

  private writeContent(node: ExportNode, pageId: string): void {
    if (node.kind === 'database' || node.markdown.trim() === '') return;
    const content = markdownToBlocks(node.markdown, this.resolver(node, pageId));
    if (content.length > 0) updatePage(this.db, pageId, { content });
  }

  private resolver(node: ExportNode, pageId: string): MarkdownResolver {
    const fromDir = dirName(node.path);
    const file = (href: string): ResolvedFile | null => {
      const target = resolveRelativePath(fromDir, href);
      return target === null ? null : this.storeFile(target, pageId);
    };
    return {
      file,
      href: (href) => {
        if (externalHref.test(href)) return href;
        const target = resolveRelativePath(fromDir, href);
        const linked = target === null ? undefined : this.tree.nodes.get(target);
        const linkedId = linked ? this.pageIds.get(linked) : undefined;
        if (linkedId !== undefined) return `/pages/${linkedId}`;
        return file(href)?.url ?? null;
      },
    };
  }

  /** Stores a file of the export as an attachment of the page, once per page. */
  private storeFile(path: string, pageId: string): ResolvedFile | null {
    const extension = extensionOf(path);
    const bytes = this.tree.files.get(path);
    if (!bytes || extension === 'md' || extension === 'csv') return null;
    const key = `${pageId}\n${path}`;
    const known = this.stored.get(key);
    if (known) return known;
    const fileName = baseName(path);
    try {
      const attachment = storeAttachmentBytes(
        this.db,
        this.files,
        pageId,
        { fileName, mime: mimeForExtension(extension), bytes },
        this.onFileWritten,
      );
      const resolved = {
        url: attachmentUrl(attachment.id),
        name: fileName,
        isImage: isImageExtension(extension),
      };
      this.stored.set(key, resolved);
      this.counts.attachments += 1;
      return resolved;
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      this.warnings.push(`Skipped file "${path}": ${error.message}`);
      return null;
    }
  }
}
