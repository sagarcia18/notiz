import { NOTIZ_BPMN_NAMESPACE } from '@notiz/shared';
import type Modeler from 'bpmn-js/lib/Modeler';

/** The parts of diagram-js services this app uses (diagram-js is not a direct dependency). */
export interface DiagramElement {
  id: string;
  type: string;
  businessObject: { get: (name: string) => unknown };
}

interface Canvas {
  zoom: (level: 'fit-viewport') => void;
}

interface Modeling {
  updateProperties: (element: DiagramElement, properties: Record<string, unknown>) => void;
}

interface Overlays {
  add: (
    elementId: string,
    type: string,
    overlay: { position: { bottom: number; left: number }; html: HTMLElement },
  ) => void;
  remove: (filter: { type: string }) => void;
}

interface ElementRegistry {
  get: (id: string) => DiagramElement | undefined;
}

export interface SelectedTask {
  elementId: string;
  pageId: string | null;
}

/** bpmn-js moddle extension: lets every BPMN element carry `notiz:pageId`. */
export const notizModdleExtension = {
  name: 'Notiz',
  prefix: 'notiz',
  uri: NOTIZ_BPMN_NAMESPACE,
  xml: { tagAlias: 'lowerCase' },
  associations: [],
  types: [
    {
      name: 'PageLink',
      extends: ['bpmn:BaseElement'],
      properties: [{ name: 'pageId', isAttr: true, type: 'String' }],
    },
  ],
};

const PAGE_ID_ATTRIBUTE = 'notiz:pageId';
const BADGE_OVERLAY = 'notiz-page-link';

/** Every BPMN task type (task, user task, service task, ...) ends in "Task". */
export function isTask(element: Pick<DiagramElement, 'type'>): boolean {
  return /^bpmn:\w*Task$/.test(element.type);
}

export function pageIdOf(element: DiagramElement): string | null {
  const value = element.businessObject.get(PAGE_ID_ATTRIBUTE);
  return typeof value === 'string' && value !== '' ? value : null;
}

export function fitViewport(modeler: Modeler): void {
  modeler.get<Canvas>('canvas').zoom('fit-viewport');
}

/** The single selected task, or null for no / several / non-task selections. */
export function selectedTaskOf(selection: readonly DiagramElement[]): SelectedTask | null {
  const [element] = selection;
  if (selection.length !== 1 || !element || !isTask(element)) return null;
  return { elementId: element.id, pageId: pageIdOf(element) };
}

export function findElement(modeler: Modeler, id: string): DiagramElement | undefined {
  return modeler.get<ElementRegistry>('elementRegistry').get(id);
}

/** Sets or (with null) removes the page link as an undoable command. */
export function setPageLink(modeler: Modeler, elementId: string, pageId: string | null): void {
  const element = findElement(modeler, elementId);
  if (!element) return;
  modeler
    .get<Modeling>('modeling')
    .updateProperties(element, { [PAGE_ID_ATTRIBUTE]: pageId ?? undefined });
}

/** Shows each host element as a badge below its diagram element. */
export function placeBadges(modeler: Modeler, hosts: ReadonlyMap<string, HTMLElement>): void {
  const overlays = modeler.get<Overlays>('overlays');
  overlays.remove({ type: BADGE_OVERLAY });
  for (const [elementId, html] of hosts) {
    if (findElement(modeler, elementId)) {
      overlays.add(elementId, BADGE_OVERLAY, { position: { bottom: -4, left: 0 }, html });
    }
  }
}
