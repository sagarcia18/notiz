import type { OptionColor, WidgetBucket } from '@notiz/shared';
import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatValue } from './widgetSettings';

/**
 * Fills follow the option colors the user picked for the pills, so a status
 * looks the same everywhere. They are not a validated categorical palette;
 * axis labels, legends and tooltips name every bucket, so color is never the
 * only cue.
 */
const optionFills: Record<OptionColor, string> = {
  gray: '#9b9a97',
  brown: '#a27763',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
  red: '#d44c47',
};
const noValueFill = '#c7c6c4';

function fillOf(bucket: WidgetBucket): string {
  return bucket.color === null ? noValueFill : optionFills[bucket.color];
}

const axisTick = { fill: 'var(--text-muted)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 13,
};

function tooltipValue(value: unknown): string {
  return typeof value === 'number' ? formatValue(value) : '–';
}

export function BarWidget({ buckets }: { buckets: WidgetBucket[] }): ReactElement {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--hover)' }}
          contentStyle={tooltipStyle}
          formatter={(value) => [tooltipValue(value), '']}
          separator=""
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false}>
          {buckets.map((bucket) => (
            <Cell key={bucket.key} fill={fillOf(bucket)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieWidget({ buckets }: { buckets: WidgetBucket[] }): ReactElement {
  const slices = buckets.filter((bucket) => (bucket.value ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius="50%"
          outerRadius="80%"
          stroke="var(--bg)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {slices.map((bucket) => (
            <Cell key={bucket.key} fill={fillOf(bucket)} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => tooltipValue(value)} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(label: string) => <span style={{ color: 'var(--text)' }}>{label}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
