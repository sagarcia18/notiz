import { type PageContent, attachmentSchema, pageDetailSchema } from '@notiz/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { sendJson, uploadFile } from '../../lib/apiClient';
import { pageKeys } from '../pages/usePages';
import { SaveQueue, type SaveStatus } from './saveQueue';

const SAVE_DELAY_MS = 800;

export interface PageContentSaver {
  status: SaveStatus;
  /** Schedules a debounced save of the whole document. */
  save: (content: PageContent) => void;
  /** Uploads a file to the page and returns the URL the editor should show. */
  upload: (file: File) => Promise<string>;
}

/** Autosaves the editor document of one page; pending changes are flushed on leave. */
export function usePageContent(pageId: string): PageContentSaver {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [queue] = useState(
    () =>
      new SaveQueue<PageContent>({
        delayMs: SAVE_DELAY_MS,
        onStatus: setStatus,
        save: async (content) => {
          const page = await sendJson(
            'PATCH',
            `/api/pages/${pageId}`,
            { content },
            pageDetailSchema,
          );
          queryClient.setQueryData(pageKeys.detail(pageId), page);
        },
      }),
  );

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent): void => {
      if (queue.hasPending()) {
        void queue.flush();
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', warnIfUnsaved);
    return () => {
      window.removeEventListener('beforeunload', warnIfUnsaved);
      void queue.flush();
    };
  }, [queue]);

  const save = useCallback((content: PageContent) => queue.schedule(content), [queue]);

  const upload = useCallback(
    async (file: File) => {
      const attachment = await uploadFile(
        `/api/pages/${pageId}/attachments`,
        file,
        attachmentSchema,
      );
      return attachment.url;
    },
    [pageId],
  );

  return { status, save, upload };
}
