import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecentRuns } from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { ModelLabel } from '../components/model/ModelBadge';
import { HuggingFaceBoundary } from '../components/run/HuggingFace';
import { OutcomeText } from '../components/run/Outcome';
import { RunTimeline, TimelineLegendRow } from '../components/run/RunTimeline';
import { runRecordsPath } from '../routes/runRecords';
import { leaderboardPath } from '../routes/site';
import { Loading } from '../ui/content';
import { TextLink } from '../ui/controls';
import { GoArrowIcon } from '../ui/icons';
import table from '../ui/table.module.css';
import { useCurrentBenchmark } from './benchmarkContext';
import styles from './benchmarkBlocks.module.css';

/* Blocks a benchmark page's document places to show the benchmark's data. */

/** The benchmark's top combinations, at most five, with a link to its full leaderboard. */
export function LeaderboardBlock({ top = 5 }: { top?: number }) {
  const { t } = useTranslation();
  const benchmark = useCurrentBenchmark();
  return (
    <div className={styles.block}>
      <LeaderboardTable benchmarkId={benchmark.id} entries={benchmark.topFive.slice(0, top)} metric={benchmark.metric} />
      <TextLink className="t-small" to={leaderboardPath({ bench: benchmark.id })}>{t('benchmarks.fullLeaderboard')}</TextLink>
    </div>
  );
}

/**
 * Runs the benchmark page lists, each opening its trajectory, with a link to all run records. They are read apart from
 * the page, so the page stands even when their records, kept on Hugging Face, cannot be read.
 */
export function RecentRunsBlock() {
  const { t } = useTranslation();
  const benchmark = useCurrentBenchmark();
  return (
    <div className={styles.block}>
      <HuggingFaceBoundary resetKey={benchmark.id}>
        <Suspense fallback={<Loading />}>
          <RecentRunsTable benchmarkId={benchmark.id} />
        </Suspense>
      </HuggingFaceBoundary>
      <div className={styles.foot}>
        <TimelineLegendRow legend={benchmark.timelineLegend} />
        <TextLink className="t-small" to={runRecordsPath(benchmark.id)}>{t('benchmarks.allRuns')}</TextLink>
      </div>
    </div>
  );
}

export function RecentRunsTable({ benchmarkId }: { benchmarkId: string }) {
  const { t } = useTranslation();
  const recentRuns = useRecentRuns(benchmarkId);
  return (
    <div className={clsx(table.table, styles.runs)} role="table" aria-label={t('benchmarks.recentRuns')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('benchmarks.column.model')}</span><span role="columnheader">{t('benchmarks.column.task')}</span>
        <span role="columnheader">{t('benchmarks.column.process')}</span><span role="columnheader">{t('benchmarks.column.result')}</span>
        <span role="columnheader">{t('benchmarks.column.steps')}</span><span role="columnheader">{t('benchmarks.column.duration')}</span><span role="columnheader"><span className="visually-hidden">{t('benchmarks.column.trajectory')}</span></span>
      </div>
      {recentRuns.map(run => (
        <LocaleLink key={run.runId} role="row" className={clsx(table.row, table.link)} to={runRecordsPath(benchmarkId, { task: run.task.id, run: run.runId, tab: 'trajectory' })}>
          <span role="cell"><ModelLabel model={run.model} /></span>
          <span role="cell" className={styles.cell}><span className="t-mono c-faint">{run.task.id}</span><span className="t-small">{run.task.title}</span></span>
          <span role="cell"><RunTimeline timeline={run.timeline} /></span>
          <span role="cell" className="t-small"><OutcomeText outcome={run.outcome}>{run.resultLabel}</OutcomeText></span>
          <span role="cell" className="t-numeric c-muted">{t('benchmarks.steps', { count: run.stepCount })}</span>
          <span role="cell" className="t-numeric c-muted">{t('benchmarks.minutes', { count: run.durationMinutes })}</span>
          <span role="cell" className={clsx(table.arrow, 't-small')}>{t('benchmarks.openTrajectory')}<GoArrowIcon /></span>
        </LocaleLink>
      ))}
    </div>
  );
}
