import { z } from 'zod';

/**
 * A BlockNote block. Only the fields the app relies on are checked; everything
 * else (props, styles, ids) is passed through untouched.
 */
export interface ContentBlock {
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: ContentBlock[];
  [key: string]: unknown;
}

export const contentBlockSchema: z.ZodType<ContentBlock> = z.looseObject({
  type: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  content: z.unknown().optional(),
  get children() {
    return z.array(contentBlockSchema).optional();
  },
});

export const pageContentSchema = z.array(contentBlockSchema);

export type PageContent = z.infer<typeof pageContentSchema>;

/** Block props that carry user-visible text (file names and captions). */
const textProps = ['name', 'caption'] as const;

/** Collects every `text` field below inline content (text, links, table cells). */
function collectInlineText(value: unknown, parts: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectInlineText(item, parts);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'text' && typeof child === 'string') {
      parts.push(child);
    } else if (key !== 'styles' && key !== 'props') {
      collectInlineText(child, parts);
    }
  }
}

function blockText(block: ContentBlock): string {
  const parts: string[] = [];
  collectInlineText(block.content, parts);
  for (const prop of textProps) {
    const value = block.props?.[prop];
    if (typeof value === 'string' && value !== '') parts.push(value);
  }
  return parts.join(' ').trim();
}

/** Plain-text body of a document, one line per block, used for full-text search. */
export function extractPlainText(blocks: PageContent): string {
  const lines: string[] = [];
  const visit = (list: ContentBlock[]): void => {
    for (const block of list) {
      const text = blockText(block);
      if (text !== '') lines.push(text);
      if (block.children) visit(block.children);
    }
  };
  visit(blocks);
  return lines.join('\n');
}
