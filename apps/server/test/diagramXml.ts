import { DEFAULT_BPMN_XML, NOTIZ_BPMN_NAMESPACE } from '@notiz/shared';

/** The default diagram plus one task per entry, linked to the given page id. */
export function diagramLinking(links: Record<string, string>): string {
  const tasks = Object.entries(links)
    .map(
      ([taskId, pageId]) =>
        `<bpmn:task id="${taskId}" name="${taskId}" notiz:pageId="${pageId}" />`,
    )
    .join('');
  return DEFAULT_BPMN_XML.replace(
    'id="Definitions_1"',
    `xmlns:notiz="${NOTIZ_BPMN_NAMESPACE}" id="Definitions_1"`,
  ).replace(
    '<bpmn:startEvent id="StartEvent_1" />',
    `<bpmn:startEvent id="StartEvent_1" />${tasks}`,
  );
}
