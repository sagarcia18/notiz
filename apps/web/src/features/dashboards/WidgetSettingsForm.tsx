import {
  type DashboardWidget,
  type WidgetConfig,
  type WidgetMetric,
  type WidgetType,
  widgetMetricSchema,
  widgetTypeSchema,
} from '@notiz/shared';
import { type ReactElement, useState } from 'react';
import dbStyles from '../databases/Database.module.css';
import { useDatabase } from '../databases/useDatabase';
import { usePageTree } from '../pages/usePages';
import {
  canSave,
  databaseChoices,
  groupableProperties,
  numberProperties,
  withDatabase,
  withGroupBy,
  withMetric,
} from './widgetSettings';

const typeLabels: Record<WidgetType, string> = {
  kpi: 'Number',
  bar: 'Bar chart',
  pie: 'Pie chart',
};
const metricLabels: Record<WidgetMetric, string> = {
  count: 'Count rows',
  sum: 'Sum of',
  avg: 'Average of',
};

interface FieldsProps {
  config: WidgetConfig;
  onChange: (config: WidgetConfig) => void;
}

/** View, metric and grouping; needs the chosen database's properties and views. */
function DatabaseFields({
  databaseId,
  config,
  onChange,
}: FieldsProps & { databaseId: string }): ReactElement {
  const database = useDatabase(databaseId);
  if (!database.data) {
    return <p className={dbStyles.muted}>{database.error?.message ?? 'Loading…'}</p>;
  }
  const { properties, views } = database.data;
  const groupBy = properties.find((property) => property.id === config.groupByPropertyId);
  return (
    <>
      <label className={dbStyles.line}>
        <span className={dbStyles.grow}>Filters of view</span>
        <select
          className={dbStyles.select}
          value={config.viewId ?? ''}
          onChange={(event) => onChange({ ...config, viewId: event.target.value || null })}
        >
          <option value="">None (all rows)</option>
          {views.map((view) => (
            <option key={view.id} value={view.id}>
              {view.name}
            </option>
          ))}
        </select>
      </label>
      <div className={dbStyles.line}>
        <select
          className={dbStyles.select}
          aria-label="Metric"
          value={config.metric}
          onChange={(event) =>
            onChange(withMetric(config, widgetMetricSchema.parse(event.target.value), properties))
          }
        >
          {widgetMetricSchema.options.map((metric) => (
            <option key={metric} value={metric}>
              {metricLabels[metric]}
            </option>
          ))}
        </select>
        {config.metric !== 'count' && (
          <select
            className={`${dbStyles.select} ${dbStyles.grow}`}
            aria-label="Number property"
            value={config.metricPropertyId ?? ''}
            onChange={(event) =>
              onChange({ ...config, metricPropertyId: event.target.value || null })
            }
          >
            {numberProperties(properties).length === 0 && (
              <option value="">No number property</option>
            )}
            {numberProperties(properties).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {config.type !== 'kpi' && (
        <label className={dbStyles.line}>
          <span className={dbStyles.grow}>Group by</span>
          <select
            className={dbStyles.select}
            value={config.groupByPropertyId ?? ''}
            onChange={(event) =>
              onChange(withGroupBy(config, event.target.value || null, properties))
            }
          >
            <option value="">Choose…</option>
            {groupableProperties(properties).map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {config.type !== 'kpi' && groupBy?.type === 'status' && (
        <label className={dbStyles.line}>
          <input
            type="checkbox"
            checked={config.groupByStatusGroup}
            onChange={(event) => onChange({ ...config, groupByStatusGroup: event.target.checked })}
          />
          Group statuses by To-do / In progress / Complete
        </label>
      )}
    </>
  );
}

interface WidgetSettingsFormProps {
  widget: DashboardWidget;
  saving: boolean;
  onSave: (config: WidgetConfig) => void;
}

export function WidgetSettingsForm({
  widget,
  saving,
  onSave,
}: WidgetSettingsFormProps): ReactElement {
  const [draft, setDraft] = useState(widget.config);
  const tree = usePageTree();
  const databases = databaseChoices(tree.data ?? []);
  const changed = JSON.stringify(draft) !== JSON.stringify(widget.config);

  return (
    <form
      className={dbStyles.database}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <input
        className={dbStyles.input}
        aria-label="Widget title"
        placeholder="Title"
        value={draft.title}
        maxLength={100}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <select
        className={dbStyles.select}
        aria-label="Widget type"
        value={draft.type}
        onChange={(event) =>
          setDraft({ ...draft, type: widgetTypeSchema.parse(event.target.value) })
        }
      >
        {widgetTypeSchema.options.map((type) => (
          <option key={type} value={type}>
            {typeLabels[type]}
          </option>
        ))}
      </select>
      <select
        className={dbStyles.select}
        aria-label="Database"
        value={draft.databaseId ?? ''}
        onChange={(event) => setDraft(withDatabase(draft, event.target.value || null))}
      >
        <option value="">Choose a database…</option>
        {databases.map((database) => (
          <option key={database.id} value={database.id}>
            {database.title}
          </option>
        ))}
      </select>
      {draft.databaseId !== null && (
        <DatabaseFields
          key={draft.databaseId}
          databaseId={draft.databaseId}
          config={draft}
          onChange={setDraft}
        />
      )}
      <button
        type="submit"
        className={`${dbStyles.button} ${dbStyles.buttonActive}`}
        disabled={!changed || !canSave(draft) || saving}
      >
        Save
      </button>
    </form>
  );
}
