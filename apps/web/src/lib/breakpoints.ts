/**
 * Screen size convention for the whole web app. CSS cannot read custom
 * properties inside `@media`, so stylesheets repeat these numbers:
 *   phone:  @media (max-width: 767px)
 *   tablet: @media (min-width: 768px) and (max-width: 1024px)
 *   touch:  @media (pointer: coarse)
 */
export const PHONE_MAX_WIDTH = 767;
export const TABLET_MAX_WIDTH = 1024;

export const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;
export const TABLET_QUERY = `(min-width: ${PHONE_MAX_WIDTH + 1}px) and (max-width: ${TABLET_MAX_WIDTH}px)`;
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export function breakpointForWidth(width: number): Breakpoint {
  if (width <= PHONE_MAX_WIDTH) return 'phone';
  if (width <= TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}
