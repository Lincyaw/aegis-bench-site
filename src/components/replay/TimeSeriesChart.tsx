import { useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MetricSeries } from '../../api/types';
import { clockTime } from './panel';
import { useWidth } from './useWidth';
import styles from './TimeSeriesChart.module.css';

/** The chart's height and the room its axes take inside it. */
export const CHART_HEIGHT = 120;
export const PLOT_LEFT = 44;
export const PLOT_RIGHT = 8;
export const PLOT_TOP = 8;
export const PLOT_BOTTOM = 20;

/**
 * One metric over a window of time: its line, the moment of the current step, the windows the agent queried, and a
 * tick for every step that touched the node. Hovering reads the value at a moment; a click goes to the step nearest it.
 */
export function TimeSeriesChart({ series, from, to, pointer, windows, ticks, onTime }: {
  series: MetricSeries;
  from: number;
  to: number;

  /** The current step's moment */
  pointer: number | undefined;

  /** The windows of time the agent queried this series over, shaded */
  windows: { from: number; to: number }[];

  /** The moments of the steps that touched the node */
  ticks: number[];

  onTime: (time: number) => void;
}) {
  const { t } = useTranslation();
  const [plot, width] = useWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number>();
  const start = Date.parse(series.start);
  const interval = series.intervalSeconds * 1000;
  const points = series.values.map((value, index) => ({ time: start + index * interval, value })).filter(point => point.time >= from && point.time <= to);
  const highest = Math.max(0, ...points.map(point => point.value));
  const top = highest > 0 ? highest * 1.1 : 1;
  const [left, right] = [PLOT_LEFT, Math.max(PLOT_LEFT + 1, width - PLOT_RIGHT)];
  const x = (time: number) => left + ((time - from) / (to - from)) * (right - left);
  const y = (value: number) => PLOT_TOP + (1 - value / top) * (CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM);
  const within = (time: number | undefined): time is number => time !== undefined && time >= from && time <= to;
  const timeAt = (event: MouseEvent<HTMLElement>) => from + ((event.clientX - event.currentTarget.getBoundingClientRect().left - left) / (right - left)) * (to - from);
  const [nearest] = hovered === undefined ? [] : points.toSorted((a, b) => Math.abs(a.time - hovered) - Math.abs(b.time - hovered));
  const format = (value: number) => `${Number(value.toFixed(value < 10 ? 2 : 0))} ${series.unit}`;
  return (
    <figure className={styles.chart}>
      <figcaption className={styles.head}>
        <span className="t-mono">{series.name}</span>
        <span className="t-micro c-faint">{nearest ? `${clockTime(nearest.time)} · ${format(nearest.value)}` : series.unit}</span>
      </figcaption>
      <div ref={plot} className={styles.plot}>
        {width > 0 && (
          <svg width={width} height={CHART_HEIGHT} aria-hidden="true">
            {[0, top / 2, top].map(value => (
              <g key={value}>
                <line x1={left} x2={right} y1={y(value)} y2={y(value)} className={styles.grid} />
                <text x={left - 6} y={y(value)} className={styles.axis} textAnchor="end" dominantBaseline="middle">{Number(value.toPrecision(2))}</text>
              </g>
            ))}
            {windows.map(window => (
              <rect
                key={`${window.from} ${window.to}`} className={styles.window} y={PLOT_TOP} height={CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM}
                x={x(Math.max(from, window.from))} width={Math.max(0, x(Math.min(to, window.to)) - x(Math.max(from, window.from)))}
              />
            ))}
            <path d={points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(point.time)} ${y(point.value)}`).join(' ')} className={styles.line} />
            {ticks.filter(within).map(time => <line key={time} x1={x(time)} x2={x(time)} y1={CHART_HEIGHT - PLOT_BOTTOM} y2={CHART_HEIGHT - PLOT_BOTTOM + 4} className={styles.tick} />)}
            {within(pointer) && <line x1={x(pointer)} x2={x(pointer)} y1={PLOT_TOP} y2={CHART_HEIGHT - PLOT_BOTTOM} className={styles.pointer} />}
            {nearest && (
              <g className={styles.hover}>
                <line x1={x(nearest.time)} x2={x(nearest.time)} y1={PLOT_TOP} y2={CHART_HEIGHT - PLOT_BOTTOM} />
                <circle cx={x(nearest.time)} cy={y(nearest.value)} r={4} />
              </g>
            )}
            <text x={left} y={CHART_HEIGHT - 4} className={styles.axis}>{clockTime(from)}</text>
            <text x={right} y={CHART_HEIGHT - 4} className={styles.axis} textAnchor="end">{clockTime(to)}</text>
          </svg>
        )}
        <button
          type="button" className={styles.surface} aria-label={t('console.replay.panel.chartJump', { name: series.name })}
          onPointerMove={event => setHovered(timeAt(event))} onPointerLeave={() => setHovered(undefined)} onClick={event => onTime(timeAt(event))}
        />
      </div>
    </figure>
  );
}
