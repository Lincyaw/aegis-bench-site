import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmark, useStages, type BenchmarkDetail } from '../../../api/client';
import { Document } from '../../../articles/Document';
import { BenchmarkContext } from '../../../articles/benchmarkContext';
import { LeaderboardBlock, RecentRunsBlock } from '../../../articles/benchmarkBlocks';
import { benchmarkDocumentPath, documentSections } from '../../../articles/library';
import { benchmarkCrumbs } from '../../../components/benchmark/crumbs';
import { SectionBar } from '../../../components/benchmark/SectionBar';
import { CITATION_ANCHOR } from '../../../components/citation/Citation';
import { LifecycleMiniMap } from '../../../components/lifecycle/LifecycleMap';
import { StageScene } from '../../../components/lifecycle/StageScene';
import { HALF_LABELS } from '../../../components/lifecycle/stages';
import { stageName } from '../../../components/result/presentation';
import { useLocale } from '../../../i18n/localeContext';
import { spelledNumber } from '../../../i18n/locales';
import { runRecordsPath } from '../../../routes/runRecords';
import { leaderboardPath } from '../../../routes/site';
import { FactList, Tag } from '../../../ui/content';
import { ButtonLink, TextLink } from '../../../ui/controls';
import { Breadcrumbs } from '../../../ui/navigation';
import { useHandPageSections } from '../pageSections';
import styles from './BenchmarkPage.module.css';

/** A benchmark's page: a fixed head with its data, then its editorial document, whose sections the section bar lists. */
export function BenchmarkPage() {
  const { benchmarkId = '' } = useParams();
  const locale = useLocale();
  const benchmark = useBenchmark(benchmarkId);
  const handToNav = useHandPageSections();
  const document = benchmarkDocumentPath(benchmark.id, locale);
  return (
    <BenchmarkContext.Provider value={benchmark}>
      <div data-half={benchmark.stage.half}>
        <BenchmarkHero benchmark={benchmark} />
        <SectionBar sections={documentSections(document)} handToNav={handToNav} />
        <div className={clsx('page', styles.body)}>
          <Document path={document} blocks={{ Leaderboard: LeaderboardBlock, RecentRuns: RecentRunsBlock }} />
        </div>
      </div>
    </BenchmarkContext.Provider>
  );
}

export function BenchmarkHero({ benchmark }: { benchmark: BenchmarkDetail }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const stages = useStages();
  const { stage } = benchmark;
  return (
    <section className={clsx('page', styles.hero)}>
      <div className={styles.heroText}>
        <Breadcrumbs crumbs={benchmarkCrumbs(t, benchmark)} />
        <h1 className="t-display">{benchmark.name}</h1>
        <p className="t-lead c-muted">{benchmark.summary}</p>
        <p className={styles.version}><Tag>{benchmark.version}</Tag><span className="t-micro c-faint">{t('benchmarks.updated', { date: benchmark.updatedOn })} · {t(HALF_LABELS[stage.half])} · {stageName(stage)}</span></p>
        <FactList layout="stacked" facts={[
          { label: t('benchmarks.facts.tasks'), value: t('benchmarks.tasks', { count: benchmark.taskCount }) },
          { label: t('benchmarks.facts.metric'), value: benchmark.metric.name },
          { label: t('benchmarks.facts.combinations'), value: t('benchmarks.combinations', { count: benchmark.combinationCount }) },
          { label: t('benchmarks.facts.runsPerTask'), value: t('benchmarks.times', { count: benchmark.runsPerTask }) },
        ]} />
        <div className={styles.actions}>
          <ButtonLink variant="solid" to={leaderboardPath({ bench: benchmark.id })}>{t('benchmarks.viewLeaderboard')}</ButtonLink>
          <ButtonLink variant="line" to={runRecordsPath(benchmark.id)}>{t('benchmarks.runRecords')}</ButtonLink>
          <TextLink className="t-small" href={`#${CITATION_ANCHOR}`}>{t('benchmarks.cite')}</TextLink>
        </div>
      </div>
      <div className={styles.stagePanel}>
        <StageScene stageId={stage.id} />
        <div className={styles.position}>
          <div className={styles.miniMap}><LifecycleMiniMap stages={stages} current={stage.id} /></div>
          <p>
            <span className="t-small">{stageName(stage)}</span><br />
            <span className="t-micro c-faint">{t(HALF_LABELS[stage.half])} · {t('lifecycle.position', { position: spelledNumber(locale, stage.position), total: spelledNumber(locale, stages.length) })}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
