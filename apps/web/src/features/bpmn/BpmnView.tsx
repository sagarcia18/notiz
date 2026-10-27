import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { type ChangeEvent, type ReactElement, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { saveStatusLabel } from '../editor/saveQueue';
import styles from './Bpmn.module.css';
import { diagramFileName, downloadText } from './diagramFiles';
import { LinkBadge } from './LinkBadge';
import { LinkPicker } from './LinkPicker';
import { useBpmnModeler } from './useBpmnModeler';
import { useDiagramLinks } from './useDiagramLinks';
import { useDiagramSave } from './useDiagramSave';
import { useLinkBadges } from './useLinkBadges';

export interface BpmnViewProps {
  pageId: string;
  title: string;
  initialXml: string;
}

/** BPMN modeler with autosave, import/export and task links. Render with `key={pageId}`. */
export function BpmnView({ pageId, title, initialXml }: BpmnViewProps): ReactElement {
  const autosave = useDiagramSave(pageId);
  const modeler = useBpmnModeler(initialXml, autosave.schedule);
  const { attachCanvas, error, selectedTask, linkSelectedTask } = modeler;
  const { importXml, exportXml, exportSvg, showBadges } = modeler;
  const badges = useLinkBadges(useDiagramLinks(pageId).data, showBadges);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickLink = (linkedPageId: string | null): void => {
    linkSelectedTask(linkedPageId);
    setPickerOpen(false);
  };

  const downloadBpmn = async (): Promise<void> => {
    downloadText(diagramFileName(title, 'bpmn'), await exportXml(), 'application/xml');
  };
  const downloadSvg = async (): Promise<void> => {
    downloadText(diagramFileName(title, 'svg'), await exportSvg(), 'image/svg+xml');
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importXml(await file.text());
  };

  return (
    <section className={styles.diagram}>
      <div className={styles.toolbar}>
        <p
          className={autosave.status === 'error' ? styles.statusError : styles.status}
          role="status"
        >
          {saveStatusLabel[autosave.status]}
        </p>
        {selectedTask && (
          <button type="button" className={styles.button} onClick={() => setPickerOpen(true)}>
            {selectedTask.pageId === null ? 'Link page…' : 'Change link…'}
          </button>
        )}
        <button type="button" className={styles.button} onClick={() => void downloadBpmn()}>
          Export .bpmn
        </button>
        <button type="button" className={styles.button} onClick={() => void downloadSvg()}>
          Export .svg
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => fileInputRef.current?.click()}
        >
          Import .bpmn
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".bpmn,.xml,application/xml,text/xml"
          className={styles.fileInput}
          aria-label="Import BPMN file"
          onChange={(event) => void importFile(event)}
        />
      </div>
      {pickerOpen && selectedTask && (
        <LinkPicker
          diagramId={pageId}
          linkedPageId={selectedTask.pageId}
          onPick={pickLink}
          onRemove={() => pickLink(null)}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div ref={attachCanvas} className={styles.canvas} data-testid="bpmn-canvas" />
      {badges.map(({ link, host }) =>
        createPortal(<LinkBadge link={link} />, host, link.elementId),
      )}
    </section>
  );
}
