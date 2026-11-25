import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmarkOverview } from '../api/consoleClient';
import type { EntrantResult, PendingWork, RunRow } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { useLocale } from '../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../i18n/locales';
import { ModelLabel } from '../models/ModelBadge';
import { FailureClassTag } from '../results/FailureClassTag';
import { PassRate } from '../results/PassRate';
import { formatCost, formatRate } from '../results/presentation';
import { StatTile, StatTiles } from '../ui/content';
import content from '../ui/content.module.css';
import table from '../ui/table.module.css';
import styles from './BenchmarkOverviewPage.module.css';

/** A benchmark's records at a glance: its headline figures, each combination's result and the work waiting. */
export function BenchmarkOverviewPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { benchmarkId = '' } = useParams();
  const { benchmark, totals, entrants, recentFailures, pending } = useBenchmarkOverview(benchmarkId);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: `${benchmark.name} · ${benchmark.stage.name}` }]} title={t('console.overview.title')} lead={benchmark.summary} />
      <StatTiles>
        <StatTile label={t('console.overview.stats.tasks')} value={groupedNumber(locale, benchmark.taskCount)} />
        <StatTile
          label={t('console.overview.stats.counted')}
          value={groupedNumber(locale, totals.passed + totals.failed)}
          note={totals.executionFailed > 0 ? t('console.overview.stats.countedNote', { count: totals.executionFailed }) : undefined}
        />
        <StatTile label={t('console.overview.stats.passRate')} value={totals.passRate === undefined ? '—' : formatRate(totals.passRate)} note={t('console.overview.stats.passRateNote')} />
        <StatTile label={t('console.overview.stats.unreviewed')} value={groupedNumber(locale, totals.unreviewed)} note={t('console.overview.stats.unreviewedNote')} />
      </StatTiles>
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.overview.entrants')}</h2>
        <EntrantTable entrants={entrants} />
        <p className="t-micro c-faint">{t('console.overview.entrantsNote')}</p>
      </section>
      <div className={styles.columns}>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.overview.recentFailures')}</h2>
          <ul className={styles.list}>{recentFailures.map(run => <RecentFailure key={run.id} run={run} />)}</ul>
        </section>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.overview.pending')}</h2>
          <ul className={styles.list}>{pending.map(work => <PendingItem key={work.kind} work={work} />)}</ul>
        </section>
      </div>
    </div>
  );
}

/** Each combination's pass rate, how many tasks it always or ever solved, and what a run of it costs. */
export function EntrantTable({ entrants }: { entrants: EntrantResult[] }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <div className={clsx(table.table, styles.entrants)} role="table" aria-label={t('console.overview.entrants')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.overview.column.entrant')}</span>
        <span role="columnheader">{t('console.overview.column.passRate')}</span>
        <span role="columnheader">{t('console.overview.column.everyTime')}</span>
        <span role="columnheader">{t('console.overview.column.once')}</span>
        <span role="columnheader">{t('console.overview.column.cost')}</span>
        <span role="columnheader">{t('console.overview.column.steps')}</span>
      </div>
      {entrants.map(({ model, harness, result }) => (
        <div key={`${model.id}-${harness.id}`} className={table.row} role="row">
          <span role="cell" className={styles.entrant}><ModelLabel model={model} /><span className="t-small c-muted">{harness.name}</span></span>
          <span role="cell"><PassRate rate={result.passRate} /></span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedEveryTime, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{t('console.overview.tasksOf', { solved: result.solvedOnce, total: result.tasks })}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanCostUsd === undefined ? '—' : formatCost(result.meanCostUsd)}</span>
          <span role="cell" className="t-numeric c-muted">{result.meanSteps === undefined ? '—' : groupedNumber(locale, Math.round(result.meanSteps))}</span>
        </div>
      ))}
    </div>
  );
}

export function RecentFailure({ run }: { run: RunRow }) {
  const locale = useLocale();
  return (
    <li className={styles.failure}>
      <span className={styles.who}><ModelLabel model={run.model} /><span className="t-small c-muted">{run.harness.name}</span></span>
      <span className="t-small"><span className="t-mono c-faint">{run.task.id}</span> {run.task.title}</span>
      <span className={styles.meta}><FailureClassTag failureClass={run.failureClass} /><span className="t-mono c-faint">{dateTimeOf(locale, run.finishedAt)}</span></span>
    </li>
  );
}

export function PendingItem({ work }: { work: PendingWork }) {
  const { t } = useTranslation();
  return (
    <li className={styles.pending}>
      <span className="t-label">{t(`console.overview.pendingKind.${work.kind}.title`, { count: work.count })}</span>
      <span className="t-small c-muted">{t(`console.overview.pendingKind.${work.kind}.body`)}</span>
    </li>
  );
}
