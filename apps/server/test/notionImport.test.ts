import fs from 'node:fs';
import path from 'node:path';
import { type PageTreeNode, notionImportResultSchema } from '@notiz/shared';
import { strToU8, zipSync } from 'fflate';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { importNotionExport, importRootTitle } from '../src/services/notionImport.service.js';
import { AttachmentFiles } from '../src/storage/attachmentFiles.js';
import { DatabaseApi } from './databaseApi.js';
import { multipartFile } from './helpers.js';
import { errorCode, titles } from './pageApi.js';

const HOME = `Home ${'1'.repeat(32)}`;
const TASKS = `Tasks ${'2'.repeat(32)}`;
const NOTES = `Notes ${'3'.repeat(32)}`;
const WRITE = `Write ${'4'.repeat(32)}`;
const enc = (value: string): string => encodeURIComponent(value);

const tasksCsv = [
  'Name,Status,Tags,Points,Due,Done,Assignee',
  'Write,Done,"a, b",3,"October 27, 2026",Yes,Ana',
  'Ship,Not started,b,5,,No,Ben',
].join('\n');

/** A Notion "Markdown & CSV" export, packed like Notion does: a zip holding a part zip. */
function notionExport(): Buffer {
  const part = zipSync({
    [`Workspace/${HOME}.md`]: strToU8(
      `# Home\n\nSee [Tasks](${enc(HOME)}/${enc(TASKS)}.csv) and [Notes](${enc(HOME)}/${enc(NOTES)}.md).\n\n![](${enc(HOME)}/diagram.png)\n`,
    ),
    [`Workspace/${HOME}/${NOTES}.md`]: strToU8('# Notes\n\n- first **bold** item'),
    [`Workspace/${HOME}/diagram.png`]: strToU8('png-bytes'),
    [`Workspace/${HOME}/${TASKS}.csv`]: strToU8('Name\nOnly the view'),
    [`Workspace/${HOME}/${TASKS}_all.csv`]: strToU8(tasksCsv),
    [`Workspace/${HOME}/${TASKS}/${WRITE}.md`]: strToU8(
      `# Write\n\nStatus: Done\nTags: a, b\n\nBack to [Home](../../${enc(HOME)}.md)`,
    ),
  });
  return Buffer.from(zipSync({ 'Export-abc-Part-1.zip': part }));
}

function find(nodes: PageTreeNode[], title: string): PageTreeNode | undefined {
  for (const node of nodes) {
    if (node.title === title) return node;
    const child = find(node.children, title);
    if (child) return child;
  }
  return undefined;
}

describe('Notion import API', () => {
  let api: DatabaseApi;

  beforeEach(() => {
    api = new DatabaseApi();
  });

  afterEach(async () => {
    await api.close();
  });

  function upload(content: Buffer): Promise<LightMyRequestResponse> {
    return api.app.inject({
      method: 'POST',
      url: '/api/import/notion',
      ...multipartFile('export.zip', 'application/zip', content),
    });
  }

  it('imports pages, a database with rows and an image under one new page', async () => {
    const existing = await api.create('Existing');
    const response = await upload(notionExport());
    expect(response.statusCode).toBe(201);
    const result = notionImportResultSchema.parse(response.json());
    expect(result).toMatchObject({ pages: 2, databases: 1, rows: 2, attachments: 1 });
    expect(result.warnings).toEqual(['Tasks: Skipped person property "Assignee"']);

    const tree = await api.tree();
    expect(tree[0]?.id).toBe(existing.id);
    const root = tree.find((node) => node.id === result.rootPageId);
    expect(root?.title).toMatch(/^Notion import \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(titles(root?.children ?? [])).toEqual(['Home']);
    expect(titles(root?.children[0]?.children ?? [])).toEqual(['Tasks', 'Notes']);
    expect(api.searchTitles()).toEqual(expect.arrayContaining(['Notes', 'Write', 'Ship']));
  });

  it('maps CSV columns to property types and row values', async () => {
    await upload(notionExport());
    const tasks = find(await api.tree(), 'Tasks');
    const database = await api.database(tasks?.id ?? '');
    expect(database.properties.map((p) => [p.name, p.type])).toEqual([
      ['Name', 'title'],
      ['Status', 'status'],
      ['Tags', 'multi_select'],
      ['Points', 'number'],
      ['Due', 'date'],
      ['Done', 'checkbox'],
    ]);
    const [, status, tags, points, due, done] = database.properties;
    const optionId = (index: number, name: string): string | undefined =>
      database.properties[index]?.options.find((option) => option.name === name)?.id;
    const rows = await api.viewRows(database.views[0]?.id ?? '');
    expect(rows.map((row) => row.title)).toEqual(['Write', 'Ship']);
    expect(rows[0]?.properties).toEqual({
      [status?.id ?? '']: optionId(1, 'Done'),
      [tags?.id ?? '']: [optionId(2, 'a'), optionId(2, 'b')],
      [points?.id ?? '']: 3,
      [due?.id ?? '']: '2026-10-27',
      [done?.id ?? '']: true,
    });
    expect(status?.options.find((option) => option.name === 'Done')?.group).toBe('complete');
  });

  it('converts Markdown, rewrites links to imported pages and stores images as attachments', async () => {
    await upload(notionExport());
    const tree = await api.tree();
    const home = await api.page(find(tree, 'Home')?.id ?? '');
    const [paragraph, image] = home.content;
    expect(paragraph?.content).toEqual([
      { type: 'text', text: 'See ', styles: {} },
      expect.objectContaining({ type: 'link', href: `/pages/${find(tree, 'Tasks')?.id ?? ''}` }),
      { type: 'text', text: ' and ', styles: {} },
      expect.objectContaining({ type: 'link', href: `/pages/${find(tree, 'Notes')?.id ?? ''}` }),
      { type: 'text', text: '.', styles: {} },
    ]);
    expect(image).toMatchObject({ type: 'image', props: { name: 'diagram.png' } });
    const download = await api.app.inject({ method: 'GET', url: String(image?.props?.url) });
    expect(download.body).toBe('png-bytes');

    const database = await api.database(find(tree, 'Tasks')?.id ?? '');
    const [write] = await api.viewRows(database.views[0]?.id ?? '');
    const row = await api.page(write?.id ?? '');
    expect(row.content).toEqual([
      expect.objectContaining({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Back to ', styles: {} },
          expect.objectContaining({ type: 'link', href: `/pages/${home.id}` }),
        ],
      }),
    ]);
    expect(api.searchBody(row.id)).toMatch(/^Back to\s+Home$/);
  });

  it('keeps nothing when the import fails halfway, including written files', () => {
    class FailingFiles extends AttachmentFiles {
      override writeBytesSync(storedPath: string, bytes: Uint8Array): number {
        super.writeBytesSync(storedPath, bytes);
        throw new Error('disk full');
      }
    }
    const files = new FailingFiles(api.dataDir);
    expect(() => importNotionExport(api.db, files, notionExport())).toThrow('disk full');
    expect(api.searchTitles()).toEqual([]);
    const attachments = path.join(api.dataDir, 'attachments');
    const leftovers = fs.existsSync(attachments)
      ? fs
          .readdirSync(attachments, { recursive: true })
          .filter((name) => String(name).includes('.'))
      : [];
    expect(leftovers).toEqual([]);
  });

  it('rejects files that are not zips or hold no Notion pages', async () => {
    const notZip = await upload(Buffer.from('hello'));
    expect(notZip.statusCode).toBe(400);
    expect(errorCode(notZip.json())).toBe('validation_failed');
    const empty = await upload(Buffer.from(zipSync({ 'readme.txt': strToU8('hi') })));
    expect(empty.statusCode).toBe(400);
    expect((await api.tree()).length).toBe(0);
  });

  it('names the import root after the local time', () => {
    expect(importRootTitle(new Date(2026, 0, 5, 9, 7))).toBe('Notion import 2026-01-05 09:07');
  });
});
