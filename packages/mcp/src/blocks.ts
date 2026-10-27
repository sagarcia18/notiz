import type { ContentBlock, PageContent } from '@notiz/shared';

const headingPattern = /^(#{1,3})\s+(.*)$/;
const bulletPattern = /^[-*]\s+(.*)$/;
const numberedPattern = /^\d+[.)]\s+(.*)$/;
const checkPattern = /^\[( |x|X)\]\s+(.*)$/;

function block(type: string, text: string, props: Record<string, unknown> = {}): ContentBlock {
  return {
    id: crypto.randomUUID(),
    type,
    props,
    content: text === '' ? [] : [{ type: 'text', text, styles: {} }],
    children: [],
  };
}

function lineToBlock(line: string): ContentBlock {
  const heading = headingPattern.exec(line);
  if (heading?.[1] && heading[2] !== undefined) {
    return block('heading', heading[2], { level: heading[1].length });
  }
  const check = checkPattern.exec(line);
  if (check?.[2] !== undefined) {
    return block('checkListItem', check[2], { checked: check[1] !== ' ' });
  }
  const bullet = bulletPattern.exec(line);
  if (bullet?.[1] !== undefined) return block('bulletListItem', bullet[1]);
  const numbered = numberedPattern.exec(line);
  if (numbered?.[1] !== undefined) return block('numberedListItem', numbered[1]);
  return block('paragraph', line);
}

/**
 * Converts simple Markdown-like text into BlockNote blocks, one block per non-empty line:
 * `#`/`##`/`###` headings, `-` bullets, `1.` numbered items, `[ ]`/`[x]` checklist items,
 * everything else a paragraph. Inline formatting is kept as plain text.
 */
export function textToBlocks(text: string): PageContent {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map(lineToBlock);
}
