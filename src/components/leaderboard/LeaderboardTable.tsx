import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { combinationKey } from '../../api/constraints';
import type { LeaderboardEntry, Metric } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { runRecordsPath } from '../../routes/runRecords';
import { REDUCED_MOTION_QUERY } from '../../ui/media';
import table from '../../ui/table.module.css';
import { ModelLink } from '../model/ModelBadge';
import { formatScore } from '../result/presentation';
import { ScoreBar } from '../result/ScoreBar';
import styles from './LeaderboardTable.module.css';

/**
 * Ranked combinations: the model name opens the model, the rest of the row that combination's run records. A marked
 * model's rows stand out, and the first of them comes into view whenever the board shows a new one.
 */
export function LeaderboardTable({ benchmarkId, entries, metric, markedModel }: { benchmarkId: string; entries: LeaderboardEntry[]; metric: Metric; markedModel?: string }) {
  const { t } = useTranslation();
  const firstMarked = entries.find(entry => entry.model.id === markedModel);
  const firstMarkedKey = firstMarked && combinationKey(firstMarked.model.id, firstMarked.harness.id);
  const firstMarkedRow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    firstMarkedRow.current?.scrollIntoView({ block: 'center', behavior: matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth' });
  }, [benchmarkId, firstMarkedKey]);
  return (
    <div className={clsx(table.table, styles.table)} role="table" aria-label={t('leaderboard.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">#</span><span role="columnheader">{t('leaderboard.column.model')}</span><span role="columnheader">{t('leaderboard.column.harness')}</span>
        <span role="columnheader">{metric.name}</span><span role="columnheader">{t('leaderboard.column.runs')}</span><span role="columnheader">{t('leaderboard.column.cost')}</span>
        <span role="columnheader">{t('leaderboard.column.evaluated')}</span><span role="columnheader"><span className="visually-hidden">{t('leaderboard.column.records')}</span></span>
      </div>
      {entries.map(entry => {
        const key = combinationKey(entry.model.id, entry.harness.id);
        // A combination's row opens its own runs task by task.
        const runs = runRecordsPath(benchmarkId, { by: 'model', combination: key });
        return (
          <div
            key={key} ref={key === firstMarkedKey ? firstMarkedRow : undefined} role="row" className={clsx(table.row, table.link)}
            aria-current={entry.model.id === markedModel ? 'true' : undefined}>
            <span role="cell" className="t-numeric c-muted">{entry.rank}</span>
            <span role="cell"><ModelLink model={entry.model} /></span>
            <span role="cell" className="t-small c-muted">{entry.harness.name}</span>
            <span role="cell" className={styles.score}><ScoreBar score={entry.score} /><span className="t-numeric">{formatScore(entry.score, metric)}</span></span>
            <span role="cell" className="t-numeric c-muted">{entry.runsPerTask}</span>
            <span role="cell" className="t-numeric c-muted">${entry.avgCostUsd.toFixed(2)}</span>
            <span role="cell" className="t-mono c-faint">{entry.evaluatedIn}</span>
            <LocaleLink role="cell" className={table.primary} to={runs} aria-label={t('leaderboard.runsOf', { model: entry.model.name, harness: entry.harness.name })}><span className={table.arrow}>→</span></LocaleLink>
          </div>
        );
      })}
    </div>
  );
}
