import { type NotionImportResult, notionImportResultSchema } from '@notiz/shared';
import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '../../lib/apiClient';
import { pageKeys } from '../pages/usePages';

/** Uploads a Notion export zip; the page tree reloads once it is imported. */
export function useNotionImport(): UseMutationResult<NotionImportResult, Error, File> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => uploadFile('/api/import/notion', file, notionImportResultSchema),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pageKeys.tree }),
  });
}
