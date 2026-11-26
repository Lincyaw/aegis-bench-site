import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { CollectionModelResult } from '../../api/types';
import { useLocale } from '../../i18n/localeContext';
import { groupedNumber } from '../../i18n/locales';
import { VendorBadge } from '../model/ModelBadge';
import { FailureLegend } from '../result/FailureBar';
import failureStyles from '../result/FailureBar.module.css';
import { FAILURE_KINDS, axisSteps, failureCountOf, formatCost, formatRate } from '../result/presentation';
import styles from './CollectionCharts.module.css';

/*
 * The collection's charts. Each compares the same models, one mark per model, in the colour of the benchmark's half of
 * the loop; a model's name is always written beside its mark, and every mark says its exact figures on hover.
 */

/** Each model's pass rate as a bar, best first. */
export function RankingChart({ models }: { models: CollectionModelResult[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <ol className={styles.rows}>
      {models.map(({ model, result }) => {
        const rate = result.passRate ?? 0;
        const label = t('console.collection.rankingBar', { model: model.name, rate: formatRate(rate), counted: groupedNumber(locale, result.passed + result.failed) });
        return (
          <li key={model.id} className={styles.row} title={label} aria-label={label}>
            <span className={styles.name}><VendorBadge model={model} /><span className="t-small">{model.name}</span></span>
            <span className={styles.track}><span className={styles.bar} style={{ '--share': rate } as CSSProperties} /></span>
            <span className="t-numeric">{formatRate(rate)}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The plot's size in its own units; the figure scales it to the page. */
const PLOT = { width: 640, height: 340, left: 44, right: 132, top: 16, bottom: 44 };

/** Mean cost across, pass rate up; the models on the frontier are filled and joined. */
export function CostFrontierChart({ models }: { models: CollectionModelResult[] }) {
  const { t } = useTranslation();
  const plotted = models.filter(entry => entry.result.passRate !== undefined && entry.result.meanCostUsd !== undefined);
  const costSteps = axisSteps(Math.max(...plotted.map(entry => entry.result.meanCostUsd ?? 0)) * 1.05, 4);
  const maxCost = costSteps.at(-1) ?? 1;
  const innerWidth = PLOT.width - PLOT.left - PLOT.right;
  const innerHeight = PLOT.height - PLOT.top - PLOT.bottom;
  const xOf = (cost: number) => PLOT.left + (cost / maxCost) * innerWidth;
  const yOf = (rate: number) => PLOT.top + (1 - rate) * innerHeight;
  const points = plotted.map(entry => ({ entry, x: xOf(entry.result.meanCostUsd ?? 0), y: yOf(entry.result.passRate ?? 0) }));
  const frontier = points.filter(point => point.entry.onCostFrontier).sort((a, b) => a.x - b.x);
  // Names sit to the right of their points; one that would overlap the name above it moves down.
  const labels = points.toSorted((a, b) => a.y - b.y).reduce<{ id: string; x: number; y: number }[]>((placed, point) => {
    const clash = placed.findLast(other => Math.abs(other.x - point.x) < 90 && point.y + 4 - other.y < 14);
    return [...placed, { id: point.entry.model.id, x: point.x + 9, y: clash ? clash.y + 14 : point.y + 4 }];
  }, []);
  return (
    <svg className={styles.plot} viewBox={`0 0 ${PLOT.width} ${PLOT.height}`} role="img" aria-label={t('console.collection.charts.cost')}>
      {[0, 0.25, 0.5, 0.75, 1].map(rate => (
        <g key={rate}>
          <line className={styles.grid} x1={PLOT.left} x2={PLOT.width - PLOT.right} y1={yOf(rate)} y2={yOf(rate)} />
          <text className={styles.tick} x={PLOT.left - 8} y={yOf(rate) + 4} textAnchor="end">{formatRate(rate).replace('.0', '')}</text>
        </g>
      ))}
      {costSteps.map(cost => <text key={cost} className={styles.tick} x={xOf(cost)} y={PLOT.height - PLOT.bottom + 18} textAnchor="middle">{formatCost(cost)}</text>)}
      <text className={styles.axis} x={PLOT.left + innerWidth / 2} y={PLOT.height - 6} textAnchor="middle">{t('console.collection.axisCost')}</text>
      <polyline className={styles.frontier} points={frontier.map(point => `${point.x},${point.y}`).join(' ')} />
      {points.map(({ entry, x, y }) => (
        <g key={entry.model.id}>
          <title>{t('console.collection.costPoint', { model: entry.model.name, cost: formatCost(entry.result.meanCostUsd ?? 0), rate: formatRate(entry.result.passRate ?? 0) })}</title>
          <circle className={styles.hit} cx={x} cy={y} r={12} />
          <circle className={clsx(styles.point, entry.onCostFrontier && styles.onFrontier)} cx={x} cy={y} r={5} />
        </g>
      ))}
      {labels.map(label => <text key={label.id} className={styles.label} x={label.x} y={label.y}>{plotted.find(entry => entry.model.id === label.id)?.model.name}</text>)}
    </svg>
  );
}

/** Each model's failed runs stacked by kind, on one scale, the most failures widest. */
export function FailureChart({ models }: { models: CollectionModelResult[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const most = Math.max(1, ...models.map(entry => entry.result.failed));
  return (
    <div className={styles.chart}>
      <ol className={styles.rows}>
        {models.map(({ model, result }) => (
          <li key={model.id} className={styles.row}>
            <span className={styles.name}><VendorBadge model={model} /><span className="t-small">{model.name}</span></span>
            <span className={styles.track}>
              <span className={styles.stack} style={{ '--share': result.failed / most } as CSSProperties}>
                {FAILURE_KINDS.filter(kind => failureCountOf(result, kind) > 0).map(kind => {
                  const label = `${model.name} · ${t(`console.failureClass.${kind}`)} ${groupedNumber(locale, failureCountOf(result, kind))}`;
                  return <span key={kind} className={clsx(failureStyles.kind, styles.segment)} data-kind={kind} style={{ flexGrow: failureCountOf(result, kind) }} title={label} aria-label={label} />;
                })}
              </span>
            </span>
            <span className="t-numeric">{groupedNumber(locale, result.failed)}</span>
          </li>
        ))}
      </ol>
      <FailureLegend />
    </div>
  );
}
