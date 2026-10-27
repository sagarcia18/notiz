import { describe, expect, it } from 'vitest';
import { diagramFileName } from './diagramFiles';

describe('diagramFileName', () => {
  it('uses the page title', () => {
    expect(diagramFileName('Order process', 'bpmn')).toBe('Order process.bpmn');
  });

  it('drops characters Windows does not allow and trailing dots', () => {
    expect(diagramFileName('a/b: c? ...', 'svg')).toBe('ab c.svg');
  });

  it('falls back to "diagram" for empty titles', () => {
    expect(diagramFileName('  ', 'bpmn')).toBe('diagram.bpmn');
  });
});
