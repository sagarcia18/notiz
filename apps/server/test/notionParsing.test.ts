import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../src/import/csv.js';
import { buildExportTree } from '../src/import/exportTree.js';
import { parseNotionName, resolveRelativePath } from '../src/import/notionNames.js';
import { ZipError, readZipEntries } from '../src/import/zipEntries.js';

const ID = '0123456789abcdef0123456789abcdef';
const ID2 = 'fedcba9876543210fedcba9876543210';

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, line breaks in fields, CRLF and a BOM', () => {
    const csv = '﻿Name,Notes\r\n"A, B","say ""hi""\nline 2"\r\n\r\nC,\n';
    expect(parseCsv(csv)).toEqual([
      ['Name', 'Notes'],
      ['A, B', 'say "hi"\nline 2'],
      ['C', ''],
    ]);
  });
});

describe('Notion names and links', () => {
  it('splits the Notion id from titles', () => {
    expect(parseNotionName(`Project plan ${ID}`)).toEqual({ title: 'Project plan', notionId: ID });
    expect(parseNotionName('No id here')).toEqual({ title: 'No id here', notionId: null });
  });

  it('resolves encoded relative links inside the export only', () => {
    expect(resolveRelativePath('A', 'Sub%20page.md')).toBe('A/Sub page.md');
    expect(resolveRelativePath('A/B', '../c.png')).toBe('A/c.png');
    expect(resolveRelativePath('', '../outside.md')).toBeNull();
    expect(resolveRelativePath('A', 'https://example.com')).toBeNull();
    expect(resolveRelativePath('A', '#heading')).toBeNull();
  });
});

describe('readZipEntries', () => {
  it('unpacks nested part zips into one namespace', () => {
    const part = zipSync({ 'Inner.md': strToU8('# Inner') });
    const outer = zipSync({ 'Outer.md': strToU8('# Outer'), 'Export-Part-1.zip': part });
    expect([...readZipEntries(outer, 1_000_000).keys()].sort()).toEqual(['Inner.md', 'Outer.md']);
  });

  it('rejects broken archives and archives that unpack too large', () => {
    expect(() => readZipEntries(strToU8('not a zip'), 1000)).toThrow(ZipError);
    const big = zipSync({ 'big.txt': new Uint8Array(5000) });
    expect(() => readZipEntries(big, 1000)).toThrow(/more than/);
  });
});

describe('buildExportTree', () => {
  const files = new Map<string, Uint8Array>(
    Object.entries({
      [`Home ${ID}.md`]: `# Home\n\n[Zeta](Home%20${ID}/Zeta%20${ID2}.md)\n[Tasks](Home%20${ID}/Tasks%20${ID2}.csv)`,
      [`Home ${ID}/Alpha ${ID}.md`]: '# Alpha\n\nText',
      [`Home ${ID}/Zeta ${ID2}.md`]: '# Zeta',
      [`Home ${ID}/Tasks ${ID2}.csv`]: 'Name,Status\nOnly view,Done',
      [`Home ${ID}/Tasks ${ID2}_all.csv`]: 'Name,Status\nWrite,Done\nShip,Not started',
      [`Home ${ID}/Tasks ${ID2}/Write ${ID}.md`]: '# Write\n\nStatus: Done\n\nRow body',
    }).map(([path, text]) => [path, strToU8(text)]),
  );

  it('nests subpages and orders them as the parent links them', () => {
    const { roots } = buildExportTree(files);
    expect(roots.map((root) => root.title)).toEqual(['Home']);
    const home = roots[0];
    expect(home?.children.map((child) => [child.title, child.kind])).toEqual([
      ['Zeta', 'doc'],
      ['Tasks', 'database'],
      ['Alpha', 'doc'],
    ]);
    expect(home?.children[2]?.markdown.trim()).toBe('Text');
  });

  it('reads all rows from _all.csv and matches row pages without their property lines', () => {
    const { roots, nodes } = buildExportTree(files);
    const tasks = roots[0]?.children.find((child) => child.kind === 'database');
    expect(tasks?.header).toEqual(['Name', 'Status']);
    expect(tasks?.children.map((row) => [row.title, row.cells[1], row.kind])).toEqual([
      ['Write', 'Done', 'row'],
      ['Ship', 'Not started', 'row'],
    ]);
    expect(tasks?.children[0]?.markdown.trim()).toBe('Row body');
    expect(nodes.get(`Home ${ID}/Tasks ${ID2}.csv`)).toBe(tasks);
  });
});
