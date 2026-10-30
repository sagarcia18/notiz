import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

export interface SidebarDrawer {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

/**
 * Open state of the sidebar drawer on phones and tablets. The drawer remembers
 * the path it was opened on, so any navigation closes it; Esc closes it too.
 */
export function useSidebarDrawer(): SidebarDrawer {
  const { pathname } = useLocation();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenedOn(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return {
    open,
    toggle: () => setOpenedOn(open ? null : pathname),
    close: () => setOpenedOn(null),
  };
}
