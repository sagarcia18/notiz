type Styles = Partial<Record<'bold' | 'italic' | 'strike' | 'code', true>>;

interface StyledText {
  type: 'text';
  text: string;
  styles: Styles;
}

interface LinkContent {
  type: 'link';
  href: string;
  content: StyledText[];
}

export type InlineContent = StyledText | LinkContent;

/** Maps a Markdown link target to the href to store, or null to keep only its text. */
export type ResolveHref = (href: string) => string | null;

const markers: [string, keyof Styles][] = [
  ['**', 'bold'],
  ['__', 'bold'],
  ['~~', 'strike'],
  ['*', 'italic'],
  ['_', 'italic'],
];

function sameStyles(a: Styles, b: Styles): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pushText(target: StyledText[], text: string, styles: Styles): void {
  if (text === '') return;
  const last = target.at(-1);
  if (last && sameStyles(last.styles, styles)) {
    last.text += text;
  } else {
    target.push({ type: 'text', text, styles: { ...styles } });
  }
}

/** `[text](href)` starting at `start`: returns its parts and the index after it. */
function readLink(
  source: string,
  start: number,
): { text: string; href: string; end: number } | null {
  const close = source.indexOf('](', start);
  if (close < 0) return null;
  let depth = 0;
  for (let i = close + 2; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    if (source[i] === ')') {
      if (depth === 0) {
        const href = source.slice(close + 2, i).trim();
        return { text: source.slice(start + 1, close), href, end: i + 1 };
      }
      depth -= 1;
    }
  }
  return null;
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

/** Styled runs of text (no links) with bold, italic, strike and code markers. */
function parseStyled(source: string, base: Styles = {}): StyledText[] {
  const result: StyledText[] = [];
  const styles: Styles = { ...base };
  let i = 0;
  let plain = '';
  const flush = (): void => {
    pushText(result, plain, styles);
    plain = '';
  };
  while (i < source.length) {
    const char = source[i] ?? '';
    if (char === '\\' && i + 1 < source.length) {
      plain += source[i + 1];
      i += 2;
      continue;
    }
    if (char === '`') {
      const end = source.indexOf('`', i + 1);
      if (end > i) {
        flush();
        pushText(result, source.slice(i + 1, end), { ...styles, code: true });
        i = end + 1;
        continue;
      }
    }
    const marker = markers.find(([token]) => source.startsWith(token, i));
    if (marker) {
      const [token, style] = marker;
      const intraword = token === '_' && isWordChar(source[i - 1]) && isWordChar(source[i + 1]);
      const closes = styles[style] === true || source.indexOf(token, i + token.length) > i;
      if (!intraword && closes) {
        flush();
        if (styles[style]) delete styles[style];
        else styles[style] = true;
        i += token.length;
        continue;
      }
    }
    plain += char;
    i += 1;
  }
  flush();
  return result;
}

/** Converts one Markdown paragraph into BlockNote inline content. */
export function parseInline(source: string, resolveHref: ResolveHref): InlineContent[] {
  const result: InlineContent[] = [];
  let rest = '';
  const pushAll = (items: StyledText[]): void => {
    for (const item of items) {
      const last = result.at(-1);
      if (last?.type === 'text' && sameStyles(last.styles, item.styles)) last.text += item.text;
      else result.push(item);
    }
  };
  const flush = (): void => {
    pushAll(parseStyled(rest));
    rest = '';
  };
  let i = 0;
  while (i < source.length) {
    const isImage = source.startsWith('![', i);
    const link = source[i] === '[' || isImage ? readLink(source, isImage ? i + 1 : i) : null;
    if (link) {
      flush();
      const href = resolveHref(link.href);
      const content = parseStyled(link.text === '' ? link.href : link.text);
      if (href === null) pushAll(content);
      else result.push({ type: 'link', href, content });
      i = link.end;
      continue;
    }
    rest += source[i];
    i += 1;
  }
  flush();
  return result;
}
