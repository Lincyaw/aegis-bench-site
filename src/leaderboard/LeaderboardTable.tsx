import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { LeaderboardEntry, Metric } from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocalizedNavigate } from '../i18n/localeContext';
import { ModelLink } from '../models/ModelBadge';
import { combinationKey, runRecordsPath } from '../runs/runRecordsQuery';
import table from '../ui/table.module.css';
import { formatScore } from './presentation';
import { ScoreBar } from './ScoreBar';
import styles from './LeaderboardTable.module.css';

/** Ranked combinations: the model name opens the model, the rest of the row that combination's run records. */
export function LeaderboardTable({ benchmarkId, entries, metric }: { benchmarkId: string; entries: LeaderboardEntry[]; metric: Metric }) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  return (
    <div className={clsx(table.table, styles.table)} role="table" aria-label={t('leaderboard.title')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">#</span><span role="columnheader">{t('leaderboard.column.model')}</span><span role="columnheader">{t('leaderboard.column.harness')}</span>
        <span role="columnheader">{metric.name}</span><span role="columnheader">{t('leaderboard.column.runs')}</span><span role="columnheader">{t('leaderboard.column.cost')}</span>
        <span role="columnheader">{t('leaderboard.column.evaluated')}</span><span role="columnheader" />
      </div>
      {entries.map(entry => {
        const key = combinationKey(entry.model.id, entry.harness.id);
        const runs = runRecordsPath(benchmarkId, { combination: key });
        return (
          <div key={key} role="row" className={clsx(table.row, table.link)} onClick={event => { if (!(event.target as HTMLElement).closest('a')) navigate(runs); }}>
            <span role="cell" className="t-numeric c-muted">{entry.rank}</span>
            <span role="cell"><ModelLink model={entry.model} /></span>
            <span role="cell" className="t-small c-muted">{entry.harness.name}</span>
            <span role="cell" className={styles.score}><ScoreBar score={entry.score} /><span className="t-numeric">{formatScore(entry.score, metric)}</span></span>
            <span role="cell" className="t-numeric c-muted">{entry.runsPerTask}</span>
            <span role="cell" className="t-numeric c-muted">${entry.avgCostUsd.toFixed(2)}</span>
            <span role="cell" className="t-mono c-faint">{entry.evaluatedIn}</span>
            <LocaleLink role="cell" className={table.arrow} to={runs} aria-label={t('leaderboard.runsOf', { model: entry.model.name, harness: entry.harness.name })}>→</LocaleLink>
          </div>
        );
      })}
    </div>
  );
}
