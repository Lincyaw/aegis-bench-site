import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useBenchmarks, useStages, type BenchmarkSummary } from '../api/client';
import { LocaleLink } from '../i18n/LocaleRouting';
import { formatScore } from '../leaderboard/presentation';
import { BuildingDot, HalfDot, LifecycleMap } from '../lifecycle/LifecycleMap';
import { HALF_LABELS, benchmarkStageLabels, benchmarksAt } from '../lifecycle/stages';
import { ModelLabel } from '../models/ModelBadge';
import { benchmarkPath, stageAnchor } from '../site/siteMap';
import { Tag } from '../ui/content';
import styles from './BenchmarksPage.module.css';

/** The benchmarks grouped by the lifecycle stage they evaluate, with the stages still under construction. */
export function BenchmarksPage() {
  const { t } = useTranslation();
  const stages = useStages();
  const benchmarks = useBenchmarks();
  const covered = stages.filter(stage => stage.benchmarks.length > 0);
  const building = stages.filter(stage => stage.benchmarks.length === 0);
  return (
    <div className={clsx('page', styles.page)}>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <h1 className="t-display">{t('benchmarks.title')}</h1>
          <p className="t-lead c-muted">{t('benchmarks.lead')}</p>
          <ul className={clsx(styles.legend, 't-micro c-muted')}>
            <li><HalfDot half="dev" />{t('benchmarks.published')}</li>
            <li><BuildingDot />{t('benchmarks.building')}</li>
            <li className="c-faint">{t('benchmarks.mapHint')}</li>
          </ul>
        </div>
        <div className={styles.map}><LifecycleMap stages={stages} labels={benchmarkStageLabels(stages)} /></div>
      </section>
      <div className={styles.groups}>
        {covered.map(stage => (
          <section key={stage.id} aria-labelledby={stageAnchor(stage.id)}>
            <header className={styles.groupHead}>
              <h2 id={stageAnchor(stage.id)}>
                <HalfDot half={stage.half} />
                <span className="t-mono c-faint">{stage.id}</span>
                <span className="t-heading">{stage.name}</span>
              </h2>
              <span className="t-micro c-faint">{t(HALF_LABELS[stage.half])} · {t('benchmarks.count', { count: stage.benchmarks.length })}</span>
            </header>
            {benchmarksAt(stage, benchmarks).map(benchmark => <BenchmarkRow key={benchmark.id} benchmark={benchmark} />)}
          </section>
        ))}
        <p className={styles.building}>
          <Tag dashed>{t('benchmarks.building')}</Tag>
          <span className="t-small c-muted">{building.map(stage => `${stage.id} ${stage.name}`).join(' · ')}</span>
          <span className="t-micro c-faint">{t('benchmarks.comingSoon')}</span>
        </p>
      </div>
    </div>
  );
}

export function BenchmarkRow({ benchmark }: { benchmark: BenchmarkSummary }) {
  const { t } = useTranslation();
  return (
    <LocaleLink className={styles.bench} to={benchmarkPath(benchmark.id)}>
      <div className={styles.benchMain}>
        <div className={styles.benchName}><span className="t-bench">{benchmark.name}</span><Tag>{benchmark.version}</Tag></div>
        <p className="t-small c-muted">{benchmark.summary}</p>
        <p className="t-micro c-faint">{t('benchmarks.rowMeta', { count: benchmark.taskCount, metric: benchmark.metric.name, date: benchmark.updatedOn })}</p>
      </div>
      <div className={styles.top}>
        <p className="t-micro c-faint">{t('benchmarks.topThree')}</p>
        <ol>
          {benchmark.topThree.map(entry => (
            <li key={entry.rank}>
              <span className="t-mono c-faint">{entry.rank}</span>
              <ModelLabel model={entry.model} />
              <span className="t-numeric c-muted">{formatScore(entry.score, benchmark.metric)}</span>
            </li>
          ))}
        </ol>
      </div>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </LocaleLink>
  );
}
