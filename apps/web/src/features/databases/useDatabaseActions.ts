import type {
  CreatePropertyInput,
  CreateRowInput,
  CreateViewInput,
  DatabaseProperty,
  DatabaseView,
  MovePageInput,
  UpdatePageInput,
  UpdatePropertyInput,
  UpdateViewInput,
} from '@notiz/shared';
import {
  useCreateProperty,
  useCreateRow,
  useCreateView,
  useDeleteProperty,
  useDeleteView,
  useMoveRow,
  useTrashRow,
  useUpdateProperty,
  useUpdateRow,
  useUpdateView,
} from './useDatabase';

/** Everything a database view can change, as plain callbacks for presentational components. */
export interface DatabaseActions {
  createRow: (input: CreateRowInput) => void;
  updateRow: (id: string, input: UpdatePageInput) => Promise<void>;
  moveRow: (id: string, input: MovePageInput) => Promise<void>;
  trashRow: (id: string) => void;
  createProperty: (input: CreatePropertyInput, onCreated?: (p: DatabaseProperty) => void) => void;
  updateProperty: (id: string, input: UpdatePropertyInput) => void;
  deleteProperty: (id: string) => void;
  createView: (input: CreateViewInput, onCreated?: (view: DatabaseView) => void) => void;
  updateView: (id: string, input: UpdateViewInput) => void;
  deleteView: (id: string) => void;
  error: Error | null;
}

export function useDatabaseActions(databaseId: string): DatabaseActions {
  const createRow = useCreateRow(databaseId);
  const updateRow = useUpdateRow(databaseId);
  const moveRow = useMoveRow(databaseId);
  const trashRow = useTrashRow(databaseId);
  const createProperty = useCreateProperty(databaseId);
  const updateProperty = useUpdateProperty(databaseId);
  const deleteProperty = useDeleteProperty(databaseId);
  const createView = useCreateView(databaseId);
  const updateView = useUpdateView(databaseId);
  const deleteView = useDeleteView(databaseId);
  const mutations = [
    createRow,
    updateRow,
    moveRow,
    trashRow,
    createProperty,
    updateProperty,
    deleteProperty,
    createView,
    updateView,
    deleteView,
  ];

  return {
    createRow: (input) => createRow.mutate(input),
    updateRow: async (id, input) => {
      await updateRow.mutateAsync({ id, input }).catch(() => undefined);
    },
    moveRow: async (id, input) => {
      await moveRow.mutateAsync({ id, input }).catch(() => undefined);
    },
    trashRow: (id) => trashRow.mutate(id),
    createProperty: (input, onCreated) => createProperty.mutate(input, { onSuccess: onCreated }),
    updateProperty: (id, input) => updateProperty.mutate({ id, input }),
    deleteProperty: (id) => deleteProperty.mutate(id),
    createView: (input, onCreated) => createView.mutate(input, { onSuccess: onCreated }),
    updateView: (id, input) => updateView.mutate({ id, input }),
    deleteView: (id) => deleteView.mutate(id),
    error: mutations.find((mutation) => mutation.error)?.error ?? null,
  };
}
