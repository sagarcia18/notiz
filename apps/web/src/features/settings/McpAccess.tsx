import type { ReactElement } from 'react';
import { McpSwitch } from './McpSwitch';
import { useSettings, useUpdateSettings } from './useSettings';

/** Sidebar footer: loads the MCP setting and saves changes. */
export function McpAccess(): ReactElement | null {
  const settings = useSettings();
  const update = useUpdateSettings();
  if (!settings.data) return null;
  return (
    <McpSwitch
      enabled={settings.data.mcpEnabled}
      lastUsedAt={settings.data.mcpLastUsedAt}
      now={new Date(settings.dataUpdatedAt)}
      isSaving={update.isPending}
      errorMessage={update.error?.message}
      onToggle={(mcpEnabled) => update.mutate({ mcpEnabled })}
    />
  );
}
