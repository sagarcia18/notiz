export interface TextPart {
  text: string;
  match: boolean;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` into parts, marking the words that start with one of the query
 * words (the server matches words by prefix, case-insensitively).
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = query
    .split(/\s+/)
    .map((word) => word.replaceAll('"', ''))
    .filter((word) => word !== '');
  if (words.length === 0 || text === '') return text === '' ? [] : [{ text, match: false }];
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${words.map(escapeRegExp).join('|')})`, 'giu');
  const parts: TextPart[] = [];
  let last = 0;
  for (const found of text.matchAll(pattern)) {
    const start = found.index;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: found[0], match: true });
    last = start + found[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}
