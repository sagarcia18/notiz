import Modeler from 'bpmn-js/lib/Modeler';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type DiagramElement,
  type SelectedTask,
  findElement,
  fitViewport,
  notizModdleExtension,
  pageIdOf,
  placeBadges,
  selectedTaskOf,
  setPageLink,
} from './bpmnServices';

export interface BpmnModelerHandle {
  /** Callback ref for the element the modeler draws into. */
  attachCanvas: (element: HTMLDivElement | null) => void;
  /** Import or render error of the current diagram, if any. */
  error: string | undefined;
  /** The one selected task, for linking it to a page. */
  selectedTask: SelectedTask | null;
  /** Links the selected task to a page, or removes its link with null. */
  linkSelectedTask: (pageId: string | null) => void;
  /** Places the given hosts as badges below their elements (kept across imports). */
  showBadges: (hosts: ReadonlyMap<string, HTMLElement>) => void;
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
  const badgesRef = useRef<ReadonlyMap<string, HTMLElement>>(new Map());
  const [error, setError] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const show = useCallback(async (modeler: Modeler, xml: string): Promise<boolean> => {
    try {
      await modeler.importXML(xml);
      fitViewport(modeler);
      placeBadges(modeler, badgesRef.current);
      setSelectedTask(null);
      setError(undefined);
      return true;
    } catch (importError) {
      setError(`Could not open the diagram: ${messageOf(importError)}`);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!container) return undefined;
    const modeler = new Modeler({ container, moddleExtensions: { notiz: notizModdleExtension } });
    modelerRef.current = modeler;
    const emitChange = async (): Promise<void> => {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml !== undefined) onChangeRef.current(xml);
    };
    modeler.on('commandStack.changed', () => {
      // A link change keeps the selection, so refresh the selected task's link too.
      setSelectedTask((task) => {
        const element = task && findElement(modeler, task.elementId);
        return task && element ? { ...task, pageId: pageIdOf(element) } : null;
      });
      void emitChange();
    });
    modeler.on('selection.changed', (event: { newSelection: DiagramElement[] }) =>
      setSelectedTask(selectedTaskOf(event.newSelection)),
    );
    void show(modeler, initialXmlRef.current);
    return () => {
      modelerRef.current = undefined;
      modeler.destroy();
    };
  }, [container, show]);

  const linkSelectedTask = useCallback(
    (pageId: string | null) => {
      const modeler = modelerRef.current;
      if (modeler && selectedTask) setPageLink(modeler, selectedTask.elementId, pageId);
    },
    [selectedTask],
  );

  const showBadges = useCallback((hosts: ReadonlyMap<string, HTMLElement>) => {
    badgesRef.current = hosts;
    if (modelerRef.current) placeBadges(modelerRef.current, hosts);
  }, []);

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

  return {
    attachCanvas: setContainer,
    error,
    selectedTask,
    linkSelectedTask,
    showBadges,
    importXml,
    exportXml,
    exportSvg,
  };
}
