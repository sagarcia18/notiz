import type { PageKind, PageTreeNode } from '@notiz/shared';

export interface LinkTarget {
  id: string;
  title: string;
  icon: string | null;
  kind: PageKind;
}

/** All pages of the tree depth-first, without `excludeId` (the diagram itself). */
export function flattenTargets(nodes: readonly PageTreeNode[], excludeId: string): LinkTarget[] {
  return nodes.flatMap((node) => [
    ...(node.id === excludeId
      ? []
      : [{ id: node.id, title: node.title, icon: node.icon, kind: node.kind }]),
    ...flattenTargets(node.children, excludeId),
  ]);
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Targets whose title contains the query, ignoring case and accents. */
export function filterTargets<T extends { title: string }>(
  targets: readonly T[],
  query: string,
): T[] {
  const needle = normalize(query.trim());
  return needle === '' ? [...targets] : targets.filter((t) => normalize(t.title).includes(needle));
}

export function targetLabel(target: { title: string }): string {
  return target.title.trim() === '' ? 'Untitled' : target.title;
}
