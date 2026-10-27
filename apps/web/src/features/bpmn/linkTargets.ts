import type { DiagramLink, PageKind, PageTreeNode } from '@notiz/shared';

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

export function rowCountLabel(count: number): string {
  return count === 1 ? '1 row' : `${count} rows`;
}

/** Hover text: what the badge opens, plus a linked database's description. */
export function badgeTooltip(link: DiagramLink): string {
  const opens = `Open ${targetLabel(link)}`;
  const description = link.description?.trim() ?? '';
  return description === '' ? opens : `${opens}\n${description}`;
}
