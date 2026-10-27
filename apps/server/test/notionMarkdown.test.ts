import type { ContentBlock } from '@notiz/shared';
import { describe, expect, it } from 'vitest';
import { parseInline } from '../src/import/inlineMarkdown.js';
import { type MarkdownResolver, markdownToBlocks } from '../src/import/markdownBlocks.js';

const resolver: MarkdownResolver = {
  href: (href) => (href.startsWith('http') ? href : href === 'page.md' ? '/pages/p1' : null),
  file: (href) =>
    href === 'pic.png'
      ? { url: '/api/attachments/a1', name: 'pic.png', isImage: true }
      : href === 'doc.pdf'
        ? { url: '/api/attachments/a2', name: 'doc.pdf', isImage: false }
        : null,
};

/** Blocks without random ids, for readable expectations. */
function shape(blocks: ContentBlock[]): unknown[] {
  return blocks.map(({ children, ...rest }) => {
    delete rest.id;
    return { ...rest, ...(children && children.length > 0 ? { children: shape(children) } : {}) };
  });
}

const text = (value: string, styles = {}): unknown => ({ type: 'text', text: value, styles });

describe('parseInline', () => {
  it('keeps bold, italic, strike and code styles', () => {
    expect(parseInline('a **b** *c* ~~d~~ `e*f`', resolver.href)).toEqual([
      text('a '),
      text('b', { bold: true }),
      text(' '),
      text('c', { italic: true }),
      text(' '),
      text('d', { strike: true }),
      text(' '),
      text('e*f', { code: true }),
    ]);
  });

  it('leaves unmatched markers and snake_case words alone', () => {
    expect(parseInline('2 * 3 and snake_case_name', resolver.href)).toEqual([
      text('2 * 3 and snake_case_name'),
    ]);
  });

  it('turns resolvable links into links and others into text', () => {
    expect(
      parseInline('[Site](https://x.org) [Page](page.md) [Gone](gone.md)', resolver.href),
    ).toEqual([
      { type: 'link', href: 'https://x.org', content: [text('Site')] },
      text(' '),
      { type: 'link', href: '/pages/p1', content: [text('Page')] },
      text(' Gone'),
    ]);
  });
});

describe('markdownToBlocks', () => {
  it('converts headings, paragraphs, quotes, dividers and code', () => {
    const markdown =
      '## Title\n\nLine one\nline two\n\n> quoted\n\n---\n\n```ts\nconst a = 1;\n```\n#### Deep';
    expect(shape(markdownToBlocks(markdown, resolver))).toEqual([
      { type: 'heading', props: { level: 2 }, content: [text('Title')] },
      { type: 'paragraph', props: {}, content: [text('Line one\nline two')] },
      { type: 'quote', props: {}, content: [text('quoted')] },
      { type: 'divider', props: {} },
      { type: 'codeBlock', props: { language: 'ts' }, content: [text('const a = 1;')] },
      { type: 'heading', props: { level: 3 }, content: [text('Deep')] },
    ]);
  });

  it('nests list items and reads checkboxes', () => {
    const markdown = '- one\n    - nested\n1. first\n- [x] done\n- [ ] open';
    expect(shape(markdownToBlocks(markdown, resolver))).toEqual([
      {
        type: 'bulletListItem',
        props: {},
        content: [text('one')],
        children: [{ type: 'bulletListItem', props: {}, content: [text('nested')] }],
      },
      { type: 'numberedListItem', props: {}, content: [text('first')] },
      { type: 'checkListItem', props: { checked: true }, content: [text('done')] },
      { type: 'checkListItem', props: { checked: false }, content: [text('open')] },
    ]);
  });

  it('makes image and file blocks from local files and keeps external images', () => {
    const markdown = '![](pic.png)\n\n[Report](doc.pdf)\n\n![Logo](https://x.org/logo.png)';
    expect(shape(markdownToBlocks(markdown, resolver))).toEqual([
      {
        type: 'image',
        props: { url: '/api/attachments/a1', name: 'pic.png', caption: '' },
        content: [],
      },
      {
        type: 'file',
        props: { url: '/api/attachments/a2', name: 'Report', caption: '' },
        content: [],
      },
      {
        type: 'image',
        props: { url: 'https://x.org/logo.png', name: 'Logo', caption: '' },
        content: [],
      },
    ]);
  });

  it('converts tables and unwraps callouts', () => {
    const markdown = '| A | B |\n| --- | --- |\n| 1 | **2** |\n\n<aside>\n💡 Tip\n</aside>';
    const [table, tip] = markdownToBlocks(markdown, resolver);
    expect(table?.content).toEqual({
      type: 'tableContent',
      rows: [
        {
          cells: [
            { type: 'tableCell', content: [text('A')] },
            { type: 'tableCell', content: [text('B')] },
          ],
        },
        {
          cells: [
            { type: 'tableCell', content: [text('1')] },
            { type: 'tableCell', content: [text('2', { bold: true })] },
          ],
        },
      ],
    });
    expect(tip).toMatchObject({ type: 'paragraph', content: [text('💡 Tip')] });
  });
});
