import { describe, expect, it } from 'vitest';
import { DEFAULT_BPMN_XML } from './bpmn.js';
import { extractDiagramLinks } from './diagramLinks.js';

describe('extractDiagramLinks', () => {
  it('finds linked elements in document order, attributes in any order', () => {
    const xml = `<bpmn:definitions xmlns:notiz="http://notiz.local/schema/bpmn/1.0">
      <bpmn:process id="P1">
        <bpmn:userTask id="Task_1" name="Review" notiz:pageId="page-a">
          <bpmn:incoming>Flow_1</bpmn:incoming>
        </bpmn:userTask>
        <bpmn:task notiz:pageId="page-b" name="Ship" id="Task_2" />
        <bpmn:task id="Task_3" name="Unlinked" />
      </bpmn:process>
    </bpmn:definitions>`;
    expect(extractDiagramLinks(xml)).toEqual([
      { elementId: 'Task_1', pageId: 'page-a' },
      { elementId: 'Task_2', pageId: 'page-b' },
    ]);
  });

  it('returns no links for a diagram without links', () => {
    expect(extractDiagramLinks(DEFAULT_BPMN_XML)).toEqual([]);
  });

  it('skips links without an element id', () => {
    expect(extractDiagramLinks('<bpmn:task notiz:pageId="x" />')).toEqual([]);
  });
});
