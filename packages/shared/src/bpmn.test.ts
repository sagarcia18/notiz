import { describe, expect, it } from 'vitest';
import { DEFAULT_BPMN_XML, diagramXmlSchema, extractBpmnText } from './bpmn.js';

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D1">
  <bpmn:collaboration id="C1">
    <bpmn:participant id="P1" name="Fire &amp; Safety" processRef="Process_1" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1">
    <bpmn:laneSet id="LS1"><bpmn:lane id="L1" name="Engineer" /></bpmn:laneSet>
    <bpmn:startEvent id="S1" name="Request received" />
    <bpmn:task id="T1" name="Check &quot;detección&quot;&#10;layout">
      <bpmn:documentation>Use the <![CDATA[<latest>]]> plan</bpmn:documentation>
    </bpmn:task>
    <bpmn:exclusiveGateway id="G1" name='Approved?' />
    <bpmn:sequenceFlow id="F1" name="" sourceRef="S1" targetRef="T1" />
    <bpmn:textAnnotation id="A1"><bpmn:text>Ask the client &lt;first&gt;</bpmn:text></bpmn:textAnnotation>
  </bpmn:process>
</bpmn:definitions>`;

describe('extractBpmnText', () => {
  it('collects element names, documentation and annotations', () => {
    expect(extractBpmnText(sample).split('\n')).toEqual([
      'Fire & Safety',
      'Engineer',
      'Request received',
      'Check "detección"',
      'layout',
      'Approved?',
      'Use the <latest> plan',
      'Ask the client <first>',
    ]);
  });

  it('returns an empty string for a diagram without text', () => {
    expect(extractBpmnText(DEFAULT_BPMN_XML)).toBe('');
  });

  it('works with the default namespace (no prefix)', () => {
    const xml =
      '<definitions><process><task name="Plain"/><text>Note</text></process></definitions>';
    expect(extractBpmnText(xml)).toBe('Plain\nNote');
  });
});

describe('diagramXmlSchema', () => {
  it('accepts BPMN documents with or without a prefix', () => {
    expect(diagramXmlSchema.safeParse(DEFAULT_BPMN_XML).success).toBe(true);
    expect(diagramXmlSchema.safeParse('<definitions id="x"></definitions>').success).toBe(true);
  });

  it('rejects other documents', () => {
    expect(diagramXmlSchema.safeParse('<svg></svg>').success).toBe(false);
    expect(diagramXmlSchema.safeParse('hello').success).toBe(false);
  });
});
