import type { DashboardWidget, WidgetConfig } from '@notiz/shared';
import type { ReactElement } from 'react';
import dbStyles from '../databases/Database.module.css';
import { Popover } from '../databases/Popover';
import styles from './Dashboard.module.css';
import { WidgetBody } from './WidgetBody';
import { WidgetSettingsForm } from './WidgetSettingsForm';

/** Grabbing the header moves the widget; buttons inside it stay clickable. */
export const DRAG_HANDLE_CLASS = styles.header ?? '';

const fallbackTitles = { kpi: 'Number', bar: 'Bar chart', pie: 'Pie chart' } as const;

interface WidgetCardProps {
  widget: DashboardWidget;
  saving: boolean;
  onSave: (config: WidgetConfig) => void;
  onDelete: () => void;
}

export function WidgetCard({ widget, saving, onSave, onDelete }: WidgetCardProps): ReactElement {
  return (
    <section className={styles.card} aria-label={widget.config.title || 'Widget'}>
      <header className={styles.header}>
        <h3 className={styles.title}>
          {widget.config.title || fallbackTitles[widget.config.type]}
        </h3>
        <Popover label="⚙" title="Widget settings" alignRight>
          <WidgetSettingsForm widget={widget} saving={saving} onSave={onSave} />
        </Popover>
        <button
          type="button"
          className={`${dbStyles.button} ${dbStyles.danger}`}
          title="Delete widget"
          aria-label="Delete widget"
          onClick={onDelete}
        >
          ✕
        </button>
      </header>
      <div className={styles.body}>
        <WidgetBody widget={widget} />
      </div>
    </section>
  );
}
