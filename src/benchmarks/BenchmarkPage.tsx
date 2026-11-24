import { clsx } from 'clsx';
import { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useBenchmark, useStages, type BenchmarkDetail } from '../api/client';
import { Document } from '../articles/Document';
import { CITATION_ANCHOR, benchmarkDocumentPath, documentSections } from '../articles/library';
import { useLocale } from '../i18n/localeContext';
import { spelledNumber } from '../i18n/locales';
import { LifecycleMiniMap } from '../lifecycle/LifecycleMap';
import { StageScene } from '../lifecycle/StageScene';
import { HALF_LABELS } from '../lifecycle/stages';
import { runRecordsPath } from '../runs/runRecordsQuery';
import { PageSectionsContext } from '../site/pageSections';
import { leaderboardPath, stagePath } from '../site/siteMap';
import { FactList, Tag } from '../ui/content';
import { ButtonLink } from '../ui/controls';
import controls from '../ui/controls.module.css';
import { navHeight, readingLine } from '../ui/media';
import { Breadcrumbs, SectionLinks, type PageSection } from '../ui/navigation';
import { BenchmarkContext } from './benchmarkContext';
import { LeaderboardBlock, RecentRunsBlock } from './BenchmarkBlocks';
import styles from './BenchmarkPage.module.css';

/** A benchmark's page: a fixed head with its data, then its editorial document, whose sections the section bar lists. */
export function BenchmarkPage() {
  const { benchmarkId = '' } = useParams();
  const locale = useLocale();
  const benchmark = useBenchmark(benchmarkId);
  const document = benchmarkDocumentPath(benchmark.id, locale);
  return (
    <BenchmarkContext.Provider value={benchmark}>
      <div data-half={benchmark.stage.half}>
        <BenchmarkHero benchmark={benchmark} />
        <SectionBar sections={documentSections(document)} />
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
        <Breadcrumbs crumbs={[{ label: t('site.nav.benchmarks'), to: '/benchmarks' }, { label: `${stage.id} ${stage.name}`, to: stagePath(stage.id) }, { label: benchmark.name }]} />
        <h1 className={clsx('t-display', styles.name)}>{benchmark.name}</h1>
        <p className="t-lead c-muted">{benchmark.summary}</p>
        <p className={styles.version}><Tag>{benchmark.version}</Tag><span className="t-micro c-faint">{t('benchmarks.updated', { date: benchmark.updatedOn })} · {t(HALF_LABELS[stage.half])} · {stage.id} {stage.name}</span></p>
        <FactList layout="stacked" facts={[
          { label: t('benchmarks.facts.tasks'), value: t('benchmarks.tasks', { count: benchmark.taskCount }) },
          { label: t('benchmarks.facts.metric'), value: benchmark.metric.name },
          { label: t('benchmarks.facts.combinations'), value: t('benchmarks.combinations', { count: benchmark.combinationCount }) },
          { label: t('benchmarks.facts.runsPerTask'), value: t('benchmarks.times', { count: benchmark.runsPerTask }) },
        ]} />
        <div className={styles.actions}>
          <ButtonLink variant="solid" to={leaderboardPath(benchmark.id)}>{t('benchmarks.viewLeaderboard')}</ButtonLink>
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

/**
 * The document's sections under the head, with the one being read marked. Once the bar scrolls under the nav, the
 * floating nav carries the sections instead.
 */
export function SectionBar({ sections }: { sections: PageSection[] }) {
  const { t } = useTranslation();
  const handToNav = useContext(PageSectionsContext);
  const bar = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(sections[0]?.id ?? '');
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const reading = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (reading) {
        setCurrent(reading.target.id);
      }
    }, { rootMargin: `-${readingLine()}px 0px -60% 0px` });
    sections.forEach(section => {
      const heading = document.getElementById(section.id);
      if (!heading) {
        throw new Error(`The document has no heading #${section.id}`);
      }
      observer.observe(heading);
    });
    return () => observer.disconnect();
  }, [sections]);
  useEffect(() => {
    const barElement = bar.current;
    if (!barElement) {
      throw new Error('The section bar observes itself before it has rendered');
    }
    const top = navHeight();
    const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < top), { rootMargin: `-${top}px 0px 0px 0px` });
    observer.observe(barElement);
    return () => observer.disconnect();
  }, []);
  useEffect(() => handToNav(scrolledPast ? { sections, current } : null), [handToNav, scrolledPast, sections, current]);
  useEffect(() => () => handToNav(null), [handToNav]);
  return (
    <nav ref={bar} className={styles.sectionBar} aria-label={t('site.pageSections')}>
      <SectionLinks sections={sections} current={current} className="page" />
    </nav>
  );
}
