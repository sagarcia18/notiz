import { randomUUID } from 'node:crypto';
import type { ContentBlock, PageContent } from '@notiz/shared';
import { type InlineContent, type ResolveHref, parseInline } from './inlineMarkdown.js';

/** A local file the Markdown links to, stored as an attachment. */
export interface ResolvedFile {
  url: string;
  name: string;
  isImage: boolean;
}

export interface MarkdownResolver {
  /** Href for a link: external URLs, imported pages or files; null keeps only the text. */
  href: ResolveHref;
  /** A local file behind a link or image, or null when it is not part of the export. */
  file: (href: string) => ResolvedFile | null;
}

const fencePattern = /^(`{3,}|~{3,})\s*([\w+#-]*)/;
const dividerPattern = /^(-{3,}|\*{3,}|_{3,})$/;
const headingPattern = /^(#{1,6})\s+(.*)$/;
const listPattern = /^([-*+]|\d+[.)])\s+(?:\[( |x|X)\]\s+)?(.*)$/;
const quotePattern = /^>\s?(.*)$/;
const imageLinePattern = /^!\[([^\]]*)\]\((.+)\)$/;
const fileLinePattern = /^\[([^\]]*)\]\((.+)\)$/;
const tableSeparatorPattern = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

function makeBlock(
  type: string,
  props: Record<string, unknown> = {},
  content: unknown = [],
  children: ContentBlock[] = [],
): ContentBlock {
  return { id: randomUUID(), type, props, content, children };
}

function indentOf(line: string): number {
  const match = /^[ \t]*/.exec(line)?.[0] ?? '';
  return match.replace(/\t/g, '    ').length;
}

function dedent(lines: string[]): string[] {
  const indents = lines.filter((line) => line.trim() !== '').map(indentOf);
  const amount = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.replace(/\t/g, '    ').slice(amount));
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim());
}

class MarkdownParser {
  constructor(private readonly resolver: MarkdownResolver) {}

  inline(text: string): InlineContent[] {
    return parseInline(text, this.resolver.href);
  }

  /** A line that is only an image or a link to a local file becomes a file block. */
  fileBlock(line: string): ContentBlock | null {
    const image = imageLinePattern.exec(line);
    const link = image ?? fileLinePattern.exec(line);
    if (!link?.[2]) return null;
    const href = link[2].trim();
    const file = this.resolver.file(href);
    if (file) {
      const name = link[1] !== undefined && link[1] !== '' ? link[1] : file.name;
      return makeBlock(file.isImage ? 'image' : 'file', { url: file.url, name, caption: '' });
    }
    if (image && /^https?:\/\//i.test(href)) {
      return makeBlock('image', { url: href, name: link[1] ?? '', caption: '' });
    }
    return null;
  }

  table(lines: string[]): ContentBlock {
    const [header = [], ...body] = lines
      .filter((line) => !tableSeparatorPattern.test(line.trim()))
      .map(splitRow);
    const rows = [header, ...body].map((cells) => ({
      cells: cells.map((cell) => ({ type: 'tableCell', content: this.inline(cell) })),
    }));
    return makeBlock('table', {}, { type: 'tableContent', rows });
  }

  listItem(match: RegExpExecArray, childLines: string[]): ContentBlock {
    const [, marker = '-', check, text = ''] = match;
    const children = this.parse(dedent(childLines));
    if (check !== undefined) {
      return makeBlock('checkListItem', { checked: check !== ' ' }, this.inline(text), children);
    }
    const type = /\d/.test(marker) ? 'numberedListItem' : 'bulletListItem';
    return makeBlock(type, {}, this.inline(text), children);
  }

  parse(lines: string[]): ContentBlock[] {
    const blocks: ContentBlock[] = [];
    let i = 0;
    const takeWhile = (test: (line: string) => boolean): string[] => {
      const taken: string[] = [];
      while (i < lines.length && test(lines[i] ?? '')) {
        taken.push(lines[i] ?? '');
        i += 1;
      }
      return taken;
    };
    while (i < lines.length) {
      const raw = lines[i] ?? '';
      const line = raw.trim();
      if (line === '') {
        i += 1;
        continue;
      }
      const fence = fencePattern.exec(line);
      if (fence?.[1]) {
        const closing = fence[1];
        i += 1;
        const code = takeWhile((next) => !next.trim().startsWith(closing));
        i += 1;
        const language = fence[2] !== undefined && fence[2] !== '' ? fence[2] : 'text';
        blocks.push(
          makeBlock('codeBlock', { language }, [
            { type: 'text', text: dedent(code).join('\n'), styles: {} },
          ]),
        );
        continue;
      }
      if (dividerPattern.test(line)) {
        blocks.push({ id: randomUUID(), type: 'divider', props: {}, children: [] });
        i += 1;
        continue;
      }
      const heading = headingPattern.exec(line);
      if (heading?.[1]) {
        const level = Math.min(heading[1].length, 3);
        blocks.push(makeBlock('heading', { level }, this.inline(heading[2] ?? '')));
        i += 1;
        continue;
      }
      if (line.startsWith('|') && tableSeparatorPattern.test((lines[i + 1] ?? '').trim())) {
        blocks.push(this.table(takeWhile((next) => next.trim().startsWith('|'))));
        continue;
      }
      if (line.startsWith('<aside>')) {
        i += 1;
        const inner = takeWhile((next) => !next.trim().startsWith('</aside>'));
        i += 1;
        const rest = line.slice('<aside>'.length).trim();
        blocks.push(...this.parse(rest === '' ? inner : [rest, ...inner]));
        continue;
      }
      if (quotePattern.test(line)) {
        const quoted = takeWhile((next) => quotePattern.test(next.trim()));
        const text = quoted.map((next) => quotePattern.exec(next.trim())?.[1] ?? '').join('\n');
        blocks.push(makeBlock('quote', {}, this.inline(text)));
        continue;
      }
      const item = listPattern.exec(line);
      if (item) {
        const base = indentOf(raw);
        i += 1;
        const childLines = takeWhile((next) => next.trim() === '' || indentOf(next) > base);
        blocks.push(this.listItem(item, childLines));
        continue;
      }
      const file = this.fileBlock(line);
      if (file) {
        blocks.push(file);
        i += 1;
        continue;
      }
      const paragraph = takeWhile((next) => next.trim() !== '' && !this.startsBlock(next.trim()));
      if (paragraph.length === 0) {
        paragraph.push(raw);
        i += 1;
      }
      const text = paragraph.map((next) => next.trim()).join('\n');
      blocks.push(makeBlock('paragraph', {}, this.inline(text)));
    }
    return blocks;
  }

  private startsBlock(line: string): boolean {
    return (
      fencePattern.test(line) ||
      dividerPattern.test(line) ||
      headingPattern.test(line) ||
      listPattern.test(line) ||
      quotePattern.test(line) ||
      line.startsWith('|') ||
      line.startsWith('<aside>') ||
      imageLinePattern.test(line)
    );
  }
}

/**
 * Converts Notion's exported Markdown into BlockNote blocks: headings (levels
 * above 3 become 3), paragraphs, bullet/numbered/check lists with nesting,
 * quotes, code blocks, dividers, tables, callouts (`<aside>`, kept as their
 * inner blocks) and images or file links resolved through `resolver`.
 */
export function markdownToBlocks(markdown: string, resolver: MarkdownResolver): PageContent {
  return new MarkdownParser(resolver).parse(markdown.split(/\r?\n/));
}
