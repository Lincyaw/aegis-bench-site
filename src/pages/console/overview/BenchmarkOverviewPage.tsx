import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmarkOverview } from '../../../api/consoleClient';
import { EntrantTable, PendingItem, RecentFailure } from '../../../components/benchmark/BenchmarkOverview';
import { NO_VALUE, formatRate } from '../../../components/result/presentation';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { useLocale } from '../../../i18n/localeContext';
import { groupedNumber } from '../../../i18n/locales';
import { HintedHeading, StatTile, StatTiles } from '../../../ui/content';
import content from '../../../ui/content.module.css';
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
        <StatTile label={t('console.overview.stats.passRate')} value={totals.passRate === undefined ? NO_VALUE : formatRate(totals.passRate)} about={t('console.overview.stats.passRateNote')} />
        <StatTile label={t('console.overview.stats.unreviewed')} value={groupedNumber(locale, totals.unreviewed)} about={t('console.overview.stats.unreviewedNote')} />
      </StatTiles>
      <section className={styles.section}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.overview.entrants')} about={t('console.overview.entrantsNote')} />
        <EntrantTable benchmarkId={benchmark.id} entrants={entrants} />
      </section>
      <div className={styles.columns}>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.overview.recentFailures')}</h2>
          <ul className={styles.list}>{recentFailures.map(run => <RecentFailure key={run.id} benchmarkId={benchmark.id} run={run} />)}</ul>
        </section>
        <section className={clsx(content.panel, styles.panel)}>
          <h2 className="t-heading">{t('console.overview.pending')}</h2>
          <ul className={styles.list}>{pending.map(work => <PendingItem key={work.kind} benchmarkId={benchmark.id} work={work} />)}</ul>
        </section>
      </div>
    </div>
  );
}
