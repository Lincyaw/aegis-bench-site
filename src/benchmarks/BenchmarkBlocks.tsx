import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../i18n/LocaleRouting';
import { LeaderboardTable } from '../leaderboard/LeaderboardTable';
import { ModelLabel } from '../models/ModelBadge';
import { OutcomeText } from '../runs/Outcome';
import { RunTimeline, TimelineLegendRow } from '../runs/RunTimeline';
import { runRecordsPath } from '../runs/runRecordsQuery';
import { leaderboardPath } from '../site/siteMap';
import controls from '../ui/controls.module.css';
import table from '../ui/table.module.css';
import { useCurrentBenchmark } from './benchmarkContext';
import styles from './BenchmarkBlocks.module.css';

/** Blocks a benchmark page's document places to show the benchmark's data. */

/** The benchmark's top combinations, at most five, with a link to its full leaderboard. */
export function LeaderboardBlock({ top = 5 }: { top?: number }) {
  const { t } = useTranslation();
  const benchmark = useCurrentBenchmark();
  return (
    <div className={styles.block}>
      <LeaderboardTable benchmarkId={benchmark.id} entries={benchmark.topFive.slice(0, top)} metric={benchmark.metric} />
      <LocaleLink className={clsx(controls.textLink, 't-small')} to={leaderboardPath(benchmark.id)}>{t('benchmarks.fullLeaderboard')}</LocaleLink>
    </div>
  );
}

/** Runs the benchmark page lists, each opening its trajectory, with a link to all run records. */
export function RecentRunsBlock() {
  const { t } = useTranslation();
  const benchmark = useCurrentBenchmark();
  return (
    <div className={styles.block}>
      <div className={clsx(table.table, styles.runs)} role="table" aria-label={t('benchmarks.recentRuns')}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('benchmarks.column.model')}</span><span role="columnheader">{t('benchmarks.column.task')}</span>
          <span role="columnheader">{t('benchmarks.column.process')}</span><span role="columnheader">{t('benchmarks.column.result')}</span>
          <span role="columnheader">{t('benchmarks.column.steps')}</span><span role="columnheader">{t('benchmarks.column.duration')}</span><span role="columnheader" />
        </div>
        {benchmark.recentRuns.map(run => (
          <LocaleLink key={run.runId} role="row" className={clsx(table.row, table.link)} to={runRecordsPath(benchmark.id, { task: run.task.id, run: run.runId, tab: 'trajectory' })}>
            <span role="cell"><ModelLabel model={run.model} /></span>
            <span role="cell" className={styles.cell}><span className="t-mono c-faint">{run.task.id}</span><span className="t-small">{run.task.title}</span></span>
            <span role="cell"><RunTimeline marks={run.timeline} /></span>
            <span role="cell" className="t-small"><OutcomeText outcome={run.outcome}>{run.resultLabel}</OutcomeText></span>
            <span role="cell" className="t-numeric c-muted">{t('benchmarks.steps', { count: run.stepCount })}</span>
            <span role="cell" className="t-numeric c-muted">{t('benchmarks.minutes', { count: run.durationMinutes })}</span>
            <span role="cell" className={clsx(table.arrow, 't-small')}>{t('benchmarks.replay')}</span>
          </LocaleLink>
        ))}
      </div>
      <div className={styles.foot}>
        <TimelineLegendRow legend={benchmark.timelineLegend} />
        <LocaleLink className={clsx(controls.textLink, 't-small')} to={runRecordsPath(benchmark.id)}>{t('benchmarks.allRuns')}</LocaleLink>
      </div>
    </div>
  );
}
