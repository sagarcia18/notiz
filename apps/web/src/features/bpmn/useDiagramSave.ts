import { pageDetailSchema } from '@notiz/shared';
import { useQueryClient } from '@tanstack/react-query';
import { sendJson } from '../../lib/apiClient';
import { type AutosaveState, useSaveQueue } from '../editor/useSaveQueue';
import { pageKeys } from '../pages/usePages';
import { diagramKeys } from './useDiagramLinks';

/** Autosaves the BPMN XML of one diagram page; links are refetched after each save. */
export function useDiagramSave(pageId: string): AutosaveState<string> {
  const queryClient = useQueryClient();
  return useSaveQueue<string>(async (diagram) => {
    const page = await sendJson('PATCH', `/api/pages/${pageId}`, { diagram }, pageDetailSchema);
    queryClient.setQueryData(pageKeys.detail(pageId), page);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: diagramKeys.links(pageId) }),
      queryClient.invalidateQueries({ queryKey: diagramKeys.allUsages }),
    ]);
  });
}
