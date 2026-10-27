import { type PageContent, attachmentSchema, pageDetailSchema } from '@notiz/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { sendJson, uploadFile } from '../../lib/apiClient';
import { pageKeys } from '../pages/usePages';
import type { SaveStatus } from './saveQueue';
import { useSaveQueue } from './useSaveQueue';

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
  const { status, schedule } = useSaveQueue<PageContent>(async (content) => {
    const page = await sendJson('PATCH', `/api/pages/${pageId}`, { content }, pageDetailSchema);
    queryClient.setQueryData(pageKeys.detail(pageId), page);
  });

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

  return { status, save: schedule, upload };
}
