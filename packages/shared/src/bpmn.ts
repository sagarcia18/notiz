import { z } from 'zod';

/** Upper bound for one diagram (stays below the 10 MB JSON body limit). */
export const MAX_DIAGRAM_LENGTH = 5 * 1024 * 1024;

/** Matches the BPMN root element with or without a namespace prefix. */
const definitionsRootPattern = /<(?:[\w.-]+:)?definitions[\s>]/;

export const diagramXmlSchema = z
  .string()
  .max(MAX_DIAGRAM_LENGTH)
  .refine((xml) => definitionsRootPattern.test(xml), {
    message: 'Not a BPMN document (missing definitions element)',
  });

/** The diagram a new `bpmn` page starts with: one start event. */
export const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

const namedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** Decodes the predefined XML entities and character references. */
export function decodeXmlEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return namedEntities[code] ?? entity;
  });
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

const nameAttributePattern = /\sname\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const textElementPattern = /<((?:[\w.-]+:)?(?:text|documentation))\b[^>]*>([\s\S]*?)<\/\1\s*>/g;

/**
 * Search text of a BPMN diagram: element names (tasks, events, gateways,
 * pools, lanes, flows), text annotations and documentation, one per line.
 */
export function extractBpmnText(xml: string): string {
  const parts: string[] = [];
  for (const match of xml.matchAll(nameAttributePattern)) {
    parts.push(decodeXmlEntities(match[1] ?? match[2] ?? ''));
  }
  for (const match of xml.matchAll(textElementPattern)) {
    parts.push(decodeXmlEntities(stripCdata(match[2] ?? '')));
  }
  return parts
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join('\n');
}
