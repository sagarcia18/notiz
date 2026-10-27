import type { DiagramLink } from '@notiz/shared';
import { useEffect, useMemo } from 'react';

export interface LinkBadgeHost {
  link: DiagramLink;
  host: HTMLElement;
}

/**
 * One detached host element per link, placed on the canvas as an overlay;
 * the component renders each badge into its host with a portal.
 */
export function useLinkBadges(
  links: readonly DiagramLink[] | undefined,
  showBadges: (hosts: ReadonlyMap<string, HTMLElement>) => void,
): LinkBadgeHost[] {
  const badges = useMemo(
    () => (links ?? []).map((link) => ({ link, host: document.createElement('div') })),
    [links],
  );
  useEffect(() => {
    showBadges(new Map(badges.map(({ link, host }) => [link.elementId, host])));
  }, [badges, showBadges]);
  return badges;
}
