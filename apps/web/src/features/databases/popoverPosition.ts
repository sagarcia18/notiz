import type { CSSProperties } from 'react';

const GAP = 4;
/** Distance kept from the window edges. */
const MARGIN = 8;
/** Matches `.popover { min-width }` in Database.module.css. */
export const PANEL_MIN_WIDTH = 260;
const MIN_HEIGHT = 160;

export interface AnchorBox {
  left: number;
  right: number;
  bottom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Fixed position below the button, so scrolling containers (the table) cannot
 * clip the panel. The panel is pushed back inside the window when the button
 * sits near an edge, and never gets wider or taller than the space left.
 */
export function panelPosition(
  box: AnchorBox,
  alignRight: boolean,
  viewport: Viewport,
): CSSProperties {
  const top = box.bottom + GAP;
  const maxWidth = viewport.width - 2 * MARGIN;
  const room = Math.max(MARGIN, viewport.width - Math.min(PANEL_MIN_WIDTH, maxWidth) - MARGIN);
  const maxHeight = Math.max(MIN_HEIGHT, viewport.height - top - MARGIN);
  const edge = alignRight
    ? { right: clamp(viewport.width - box.right, MARGIN, room) }
    : { left: clamp(box.left, MARGIN, room) };
  return { top, ...edge, maxWidth, maxHeight };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
