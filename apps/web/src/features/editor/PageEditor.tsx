import type { PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import type { PageContent } from '@notiz/shared';
import type { ReactElement } from 'react';
import styles from './PageEditor.module.css';

export interface PageEditorProps {
  initialContent: PageContent;
  onChange: (content: PageContent) => void;
  uploadFile: (file: File) => Promise<string>;
}

/** BlockNote editor. Mount it with a `key` per page: content is read only once. */
export function PageEditor({
  initialContent,
  onChange,
  uploadFile,
}: PageEditorProps): ReactElement {
  const editor = useCreateBlockNote({
    // Stored content was produced by this editor; the server only checks its outline.
    initialContent:
      initialContent.length > 0 ? (initialContent as unknown as PartialBlock[]) : undefined,
    uploadFile,
  });

  return (
    <div className={styles.editor}>
      <BlockNoteView editor={editor} onChange={() => onChange(editor.document)} />
    </div>
  );
}
