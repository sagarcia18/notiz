/** A file name for an exported diagram, derived from the page title. */
export function diagramFileName(title: string, extension: 'bpmn' | 'svg'): string {
  const base = title
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/[\s.]+$/, '');
  return `${base === '' ? 'diagram' : base}.${extension}`;
}

/** Lets the browser save `text` as a file. */
export function downloadText(fileName: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
