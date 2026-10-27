import type { ReactElement } from 'react';
import styles from './McpSwitch.module.css';
import { formatLastUsed } from './lastUsed';

interface McpSwitchProps {
  enabled: boolean;
  lastUsedAt: string | null;
  now: Date;
  isSaving: boolean;
  errorMessage: string | undefined;
  onToggle: (enabled: boolean) => void;
}

/** On/off switch for Claude's access to Notiz through the MCP server. */
export function McpSwitch({
  enabled,
  lastUsedAt,
  now,
  isSaving,
  errorMessage,
  onToggle,
}: McpSwitchProps): ReactElement {
  const detail = enabled ? formatLastUsed(lastUsedAt, now) : 'Claude cannot read or change Notiz';
  return (
    <div className={styles.row}>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-describedby="mcp-switch-detail"
        className={styles.switch}
        disabled={isSaving}
        onClick={() => onToggle(!enabled)}
        title={detail}
      >
        <span className={enabled ? styles.dotOn : styles.dotOff} aria-hidden="true" />
        Claude (MCP): {enabled ? 'On' : 'Off'}
      </button>
      <span id="mcp-switch-detail" className={errorMessage ? styles.error : styles.detail}>
        {errorMessage ?? detail}
      </span>
    </div>
  );
}
