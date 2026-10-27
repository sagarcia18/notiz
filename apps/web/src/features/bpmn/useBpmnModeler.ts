import Modeler from 'bpmn-js/lib/Modeler';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Canvas {
  zoom: (level: 'fit-viewport') => void;
}

export interface BpmnModelerHandle {
  /** Callback ref for the element the modeler draws into. */
  attachCanvas: (element: HTMLDivElement | null) => void;
  /** Import or render error of the current diagram, if any. */
  error: string | undefined;
  /** Replaces the diagram; resolves to false (and sets `error`) when the XML is invalid. */
  importXml: (xml: string) => Promise<boolean>;
  exportXml: () => Promise<string>;
  exportSvg: () => Promise<string>;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Mounts a bpmn-js modeler into the element given to `attachCanvas`, shows `initialXml` and calls
 * `onChange` with the serialized diagram after every edit (undo/redo included).
 */
export function useBpmnModeler(
  initialXml: string,
  onChange: (xml: string) => void,
): BpmnModelerHandle {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const modelerRef = useRef<Modeler | undefined>(undefined);
  const initialXmlRef = useRef(initialXml);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const show = useCallback(async (modeler: Modeler, xml: string): Promise<boolean> => {
    try {
      await modeler.importXML(xml);
      modeler.get<Canvas>('canvas').zoom('fit-viewport');
      setError(undefined);
      return true;
    } catch (importError) {
      setError(`Could not open the diagram: ${messageOf(importError)}`);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!container) return undefined;
    const modeler = new Modeler({ container });
    modelerRef.current = modeler;
    const emitChange = async (): Promise<void> => {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml !== undefined) onChangeRef.current(xml);
    };
    modeler.on('commandStack.changed', () => void emitChange());
    void show(modeler, initialXmlRef.current);
    return () => {
      modelerRef.current = undefined;
      modeler.destroy();
    };
  }, [container, show]);

  const importXml = useCallback(
    async (xml: string) => {
      const modeler = modelerRef.current;
      if (!modeler || !(await show(modeler, xml))) return false;
      onChangeRef.current(xml);
      return true;
    },
    [show],
  );

  const exportXml = useCallback(async () => {
    const result = await modelerRef.current?.saveXML({ format: true });
    return result?.xml ?? initialXmlRef.current;
  }, []);

  const exportSvg = useCallback(async () => {
    const result = await modelerRef.current?.saveSVG();
    return result?.svg ?? '';
  }, []);

  return { attachCanvas: setContainer, error, importXml, exportXml, exportSvg };
}
