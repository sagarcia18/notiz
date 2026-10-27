import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  type PageDetail,
  type UpdatePageInput,
  extractPlainText,
  pageContentSchema,
  pageDetailSchema,
  pageIdSchema,
  pageKindSchema,
  pageSummarySchema,
  pageTreeSchema,
  searchResultListSchema,
} from '@notiz/shared';
import { z } from 'zod';
import type { NotizApi } from '../apiClient.js';
import { textToBlocks } from '../blocks.js';
import { errorResult, runTool } from '../toolResult.js';

/** Page detail plus its document text, so Claude does not have to read BlockNote JSON. */
function withText(page: PageDetail): PageDetail & { text: string } {
  return { ...page, text: extractPlainText(page.content) };
}

function pagePath(id: string): string {
  return `/api/pages/${encodeURIComponent(id)}`;
}

const updateShape = {
  id: pageIdSchema.describe('Page id'),
  title: z.string().max(500).optional(),
  icon: z.string().max(32).nullable().optional().describe('Emoji icon; null removes it'),
  text: z
    .string()
    .optional()
    .describe(
      'Replaces the whole document with simple Markdown-like text: one block per line, ' +
        '"# " headings, "- " bullets, "1. " numbered items, "[ ] " / "[x] " checklist items.',
    ),
  content: pageContentSchema
    .optional()
    .describe('Replaces the whole document with BlockNote blocks (as returned by get_page)'),
  diagram: z.string().optional().describe('Diagram pages only: the whole BPMN 2.0 XML'),
  description: z.string().max(2000).optional().describe('Database pages only'),
};

type UpdateArgs = { [K in keyof typeof updateShape]: z.infer<(typeof updateShape)[K]> };

function toUpdateInput(args: UpdateArgs): UpdatePageInput {
  const { title, icon, text, content, diagram, description } = args;
  const blocks = text === undefined ? content : textToBlocks(text);
  return { title, icon, content: blocks, diagram, description };
}

export function registerPageTools(server: McpServer, api: NotizApi): void {
  server.registerTool(
    'list_page_tree',
    {
      title: 'List page tree',
      description:
        'All active pages as a nested tree (id, kind, title, icon, children). ' +
        'Database rows are not included; use list_database_rows for them.',
      annotations: { readOnlyHint: true },
    },
    () => runTool(() => api.get('/api/pages/tree', pageTreeSchema)),
  );

  server.registerTool(
    'get_page',
    {
      title: 'Get page',
      description:
        'One page with its document (BlockNote JSON in `content`, plain text in `text`), ' +
        'database row properties (keyed by property id), BPMN XML in `diagram` for diagram ' +
        'pages and `description` for database pages.',
      inputSchema: { id: pageIdSchema.describe('Page id') },
      annotations: { readOnlyHint: true },
    },
    ({ id }) => runTool(async () => withText(await api.get(pagePath(id), pageDetailSchema))),
  );

  server.registerTool(
    'search_pages',
    {
      title: 'Search pages',
      description:
        'Full-text search over titles, document text, diagram labels and database ' +
        'descriptions. Every word must match (prefix match, accents ignored).',
      inputSchema: {
        query: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    ({ query, limit }) => {
      const params = new URLSearchParams({ q: query });
      if (limit !== undefined) params.set('limit', String(limit));
      return runTool(() => api.get(`/api/search?${params.toString()}`, searchResultListSchema));
    },
  );

  server.registerTool(
    'create_page',
    {
      title: 'Create page',
      description:
        'Creates a page (kind doc, database, dashboard or bpmn diagram) at the top level or ' +
        'under a doc page. Database rows are created with create_database_row instead.',
      inputSchema: {
        title: z.string().max(500),
        kind: pageKindSchema.optional().describe('Defaults to doc'),
        parentId: pageIdSchema.optional().describe('Parent doc page; omit for the top level'),
        text: z.string().optional().describe('Initial document text (doc pages), see update_page'),
      },
    },
    ({ title, kind, parentId, text }) =>
      runTool(async () => {
        const page = await api.post(
          '/api/pages',
          { title, kind, parentId: parentId ?? null },
          pageDetailSchema,
        );
        if (text === undefined) return withText(page);
        const content = textToBlocks(text);
        return withText(await api.patch(pagePath(page.id), { content }, pageDetailSchema));
      }),
  );

  server.registerTool(
    'update_page',
    {
      title: 'Update page',
      description:
        'Changes a page: title, icon, document (text or content, replaces the whole ' +
        'document), diagram XML (bpmn pages) or description (database pages). ' +
        'Database row values are changed with update_database_row.',
      inputSchema: updateShape,
    },
    (args) => {
      if (args.text !== undefined && args.content !== undefined) {
        return errorResult('validation_failed: Use either text or content, not both');
      }
      return runTool(async () =>
        withText(await api.patch(pagePath(args.id), toUpdateInput(args), pageDetailSchema)),
      );
    },
  );

  server.registerTool(
    'move_page',
    {
      title: 'Move page',
      description: 'Moves a page under another page (or to the top level) as its last child.',
      inputSchema: {
        id: pageIdSchema,
        parentId: pageIdSchema.nullable().describe('New parent; null for the top level'),
      },
    },
    ({ id, parentId }) =>
      runTool(() => api.post(`${pagePath(id)}/move`, { parentId }, pageSummarySchema)),
  );

  server.registerTool(
    'trash_page',
    {
      title: 'Move page to trash',
      description: 'Moves a page and its subpages to the trash (can be restored in the app).',
      inputSchema: { id: pageIdSchema },
      annotations: { destructiveHint: true },
    },
    ({ id }) =>
      runTool(async () => {
        await api.delete(pagePath(id));
        return { trashed: id };
      }),
  );
}
