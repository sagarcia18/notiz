import { describe, expect, it } from 'vitest';
import { type DiagramElement, linkTargetKindOf, selectedTaskOf } from './bpmnServices';

function element(id: string, type: string, pageId?: string): DiagramElement {
  return { id, type, businessObject: { get: () => pageId } };
}

describe('linkTargetKindOf', () => {
  it('links tasks to pages and data stores to databases', () => {
    expect(linkTargetKindOf({ type: 'bpmn:Task' })).toBe('page');
    expect(linkTargetKindOf({ type: 'bpmn:ServiceTask' })).toBe('page');
    expect(linkTargetKindOf({ type: 'bpmn:DataStoreReference' })).toBe('database');
    expect(linkTargetKindOf({ type: 'bpmn:DataObjectReference' })).toBeNull();
    expect(linkTargetKindOf({ type: 'bpmn:StartEvent' })).toBeNull();
  });
});

describe('selectedTaskOf', () => {
  it('describes a single linkable element with its link', () => {
    expect(selectedTaskOf([element('DataStore_1', 'bpmn:DataStoreReference', 'db-1')])).toEqual({
      elementId: 'DataStore_1',
      pageId: 'db-1',
      targetKind: 'database',
    });
    expect(selectedTaskOf([element('Task_1', 'bpmn:UserTask')])).toEqual({
      elementId: 'Task_1',
      pageId: null,
      targetKind: 'page',
    });
  });

  it('ignores other and multiple selections', () => {
    expect(selectedTaskOf([element('Start', 'bpmn:StartEvent')])).toBeNull();
    expect(
      selectedTaskOf([element('Task_1', 'bpmn:Task'), element('Task_2', 'bpmn:Task')]),
    ).toBeNull();
    expect(selectedTaskOf([])).toBeNull();
  });
});
