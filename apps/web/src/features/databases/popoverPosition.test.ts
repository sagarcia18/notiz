import { describe, expect, it } from 'vitest';
import { panelPosition } from './popoverPosition';

const desktop = { width: 1280, height: 800 };

describe('panelPosition', () => {
  it('opens below the button, left- or right-aligned', () => {
    const box = { left: 300, right: 340, bottom: 100 };
    expect(panelPosition(box, false, desktop)).toEqual({
      top: 104,
      left: 300,
      maxWidth: 1264,
      maxHeight: 688,
    });
    expect(panelPosition(box, true, desktop)).toMatchObject({ top: 104, right: 940 });
  });

  it('pushes a left-aligned panel back inside when the button is near the right edge', () => {
    const position = panelPosition({ left: 700, right: 740, bottom: 50 }, false, {
      width: 800,
      height: 600,
    });
    expect(position.left).toBe(800 - 260 - 8);
  });

  it('pushes a right-aligned panel back inside when the button is near the left edge', () => {
    const position = panelPosition({ left: 10, right: 40, bottom: 50 }, true, {
      width: 800,
      height: 600,
    });
    expect(position.right).toBe(800 - 260 - 8);
  });

  it('keeps a margin on narrow windows and limits width and height', () => {
    const position = panelPosition({ left: -20, right: 10, bottom: 560 }, false, {
      width: 240,
      height: 600,
    });
    expect(position).toEqual({ top: 564, left: 8, maxWidth: 224, maxHeight: 160 });
  });
});
