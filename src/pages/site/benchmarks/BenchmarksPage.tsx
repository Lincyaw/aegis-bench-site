import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useBenchmarks, useStages } from '../../../api/client';
import { BenchmarkRow } from '../../../components/benchmark/BenchmarkList';
import { BuildingDot, HalfDot, LifecycleMap } from '../../../components/lifecycle/LifecycleMap';
import { HALF_LABELS, benchmarkStageLabels, benchmarksAt } from '../../../components/lifecycle/stages';
import { stageName } from '../../../components/result/presentation';
import { stageAnchor } from '../../../routes/site';
import { Tag } from '../../../ui/content';
import { InfoHint } from '../../../ui/hint';
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
            <li><InfoHint label={t('ui.about', { subject: t('landing.lifecycle') })}>{t('benchmarks.mapHint')}</InfoHint></li>
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
          <span className="t-small c-muted">{building.map(stageName).join(' · ')}</span>
          <InfoHint label={t('ui.about', { subject: t('benchmarks.building') })}>{t('benchmarks.comingSoon')}</InfoHint>
        </p>
      </div>
    </div>
  );
}
