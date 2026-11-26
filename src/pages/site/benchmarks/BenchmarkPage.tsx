import { clsx } from 'clsx';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmark, useStages, type BenchmarkDetail } from '../../../api/client';
import { Document } from '../../../articles/Document';
import { BenchmarkContext } from '../../../articles/benchmarkContext';
import { LeaderboardBlock, RecentRunsBlock } from '../../../articles/benchmarkBlocks';
import { CITATION_ANCHOR, benchmarkDocumentPath, documentSections } from '../../../articles/library';
import { SectionBar } from '../../../components/benchmark/SectionBar';
import { LifecycleMiniMap } from '../../../components/lifecycle/LifecycleMap';
import { StageScene } from '../../../components/lifecycle/StageScene';
import { HALF_LABELS } from '../../../components/lifecycle/stages';
import { useLocale } from '../../../i18n/localeContext';
import { spelledNumber } from '../../../i18n/locales';
import { runRecordsPath } from '../../../routes/runRecords';
import { BENCHMARKS_PATH, leaderboardPath, stagePath } from '../../../routes/site';
import { FactList, Tag } from '../../../ui/content';
import { ButtonLink } from '../../../ui/controls';
import controls from '../../../ui/controls.module.css';
import { Breadcrumbs } from '../../../ui/navigation';
import { PageSectionsContext } from '../pageSections';
import styles from './BenchmarkPage.module.css';

/** A benchmark's page: a fixed head with its data, then its editorial document, whose sections the section bar lists. */
export function BenchmarkPage() {
  const { benchmarkId = '' } = useParams();
  const locale = useLocale();
  const benchmark = useBenchmark(benchmarkId);
  const handToNav = useContext(PageSectionsContext);
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
        <Breadcrumbs crumbs={[{ label: t('site.nav.benchmarks'), to: BENCHMARKS_PATH }, { label: `${stage.id} ${stage.name}`, to: stagePath(stage.id) }, { label: benchmark.name }]} />
        <h1 className="t-display">{benchmark.name}</h1>
        <p className="t-lead c-muted">{benchmark.summary}</p>
        <p className={styles.version}><Tag>{benchmark.version}</Tag><span className="t-micro c-faint">{t('benchmarks.updated', { date: benchmark.updatedOn })} · {t(HALF_LABELS[stage.half])} · {stage.id} {stage.name}</span></p>
        <FactList layout="stacked" facts={[
          { label: t('benchmarks.facts.tasks'), value: t('benchmarks.tasks', { count: benchmark.taskCount }) },
          { label: t('benchmarks.facts.metric'), value: benchmark.metric.name },
          { label: t('benchmarks.facts.combinations'), value: t('benchmarks.combinations', { count: benchmark.combinationCount }) },
          { label: t('benchmarks.facts.runsPerTask'), value: t('benchmarks.times', { count: benchmark.runsPerTask }) },
        ]} />
        <div className={styles.actions}>
          <ButtonLink variant="solid" to={leaderboardPath({ bench: benchmark.id })}>{t('benchmarks.viewLeaderboard')}</ButtonLink>
          <ButtonLink variant="line" to={runRecordsPath(benchmark.id)}>{t('benchmarks.runRecords')}</ButtonLink>
          <a className={clsx(controls.textLink, 't-small')} href={`#${CITATION_ANCHOR}`}>{t('benchmarks.cite')}</a>
        </div>
      </div>
      <div className={styles.stagePanel}>
        <StageScene stageId={stage.id} />
        <div className={styles.position}>
          <div className={styles.miniMap}><LifecycleMiniMap stages={stages} current={stage.id} /></div>
          <p>
            <span className="t-small">{stage.id} {stage.name}</span><br />
            <span className="t-micro c-faint">{t(HALF_LABELS[stage.half])} · {t('lifecycle.position', { position: spelledNumber(locale, stage.position), total: spelledNumber(locale, stages.length) })}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
