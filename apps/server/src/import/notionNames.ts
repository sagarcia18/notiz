/** Notion appends a 32-hex block id to every exported file and folder name. */
const idSuffix = /\s+([0-9a-f]{32})$/i;

export interface NotionName {
  title: string;
  notionId: string | null;
}

/** Splits `Title 0123…cdef` into the title and the Notion id. */
export function parseNotionName(name: string): NotionName {
  const match = idSuffix.exec(name);
  if (!match?.[1]) {
    return { title: name.trim(), notionId: null };
  }
  return { title: name.slice(0, match.index).trim(), notionId: match[1].toLowerCase() };
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function dirName(path: string): string {
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

/** The path without its extension (`a/b.md` -> `a/b`). */
export function stripExtension(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot > path.lastIndexOf('/') ? path.slice(0, dot) : path;
}

export function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot > path.lastIndexOf('/') ? path.slice(dot + 1).toLowerCase() : '';
}

/**
 * Resolves a relative Markdown link against the folder of the linking file.
 * Returns null for external links, anchors and paths that leave the export.
 */
export function resolveRelativePath(fromDir: string, href: string): string | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('/')) {
    return null;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(href.split('#')[0] ?? '');
  } catch {
    return null;
  }
  const parts = fromDir === '' ? [] : fromDir.split('/');
  for (const part of decoded.replace(/\\/g, '/').split('/')) {
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else if (part !== '.' && part !== '') {
      parts.push(part);
    }
  }
  return parts.length === 0 ? null : parts.join('/');
}
