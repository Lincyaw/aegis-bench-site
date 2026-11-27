import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useHuntTrials, useHunts } from '../../../api/consoleClient';
import { consoleHuntVerdictValues } from '../../../api/schema';
import type { Hunt, HuntTrialQuery, HuntVerdict } from '../../../api/types';
import { FacetPanel, HuntCoverageTiles } from '../../../components/hunt/Hunt';
import { HuntTrialTable } from '../../../components/hunt/HuntTrialTable';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { EVERY_CHOICE, searchOf } from '../../../routes/address';
import { consoleBenchmarkPath } from '../../../routes/console';
import { HUNT_TRIAL_PAGE_SIZE, HUNT_TRIAL_PARAMS, analysisPath, parseHuntTrialQuery } from '../../../routes/consoleAnalysis';
import { HintedHeading } from '../../../ui/content';
import { Select } from '../../../ui/controls';
import { Pager } from '../../../ui/navigation';
import styles from './AnalysisPages.module.css';

/** One hunt: what it covered and may have missed, each kind of behaviour with its probes, and the trajectories it marked or read. */
export function HuntPage() {
  const { t } = useTranslation();
  const { benchmarkId = '', huntId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const hunt = useHunts(benchmark.id).find(candidate => candidate.id === huntId);
  if (!hunt) {
    throw new Error(`no hunt ${huntId} on ${benchmark.name}`);
  }
  const query = parseHuntTrialQuery(params);
  const update = (next: Partial<HuntTrialQuery>) => setParams(searchOf(HUNT_TRIAL_PARAMS, { ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.analysis.title'), to: analysisPath(benchmark.id) }, { label: hunt.title }]}
        title={hunt.title} lead={hunt.need}
      />
      <HuntCoverageTiles hunt={hunt} />
      <section className={styles.section}>
        <HintedHeading rank="h2" className="t-heading" title={t('console.analysis.facets')} about={t('console.analysis.precisionNote')} />
        {hunt.facets.map(facet => <FacetPanel key={facet.id} facet={facet} onTrials={() => update({ facet: facet.id })} />)}
      </section>
      <HuntTrialsSection benchmarkId={benchmark.id} hunt={hunt} query={query} onChange={update} />
    </div>
  );
}

/** The trajectories the hunt marked or read, confirmed ones first; each opens its run's trajectory at the first mark. */
export function HuntTrialsSection({ benchmarkId, hunt, query, onChange }: { benchmarkId: string; hunt: Hunt; query: HuntTrialQuery; onChange: (next: Partial<HuntTrialQuery>) => void }) {
  const { t } = useTranslation();
  // The page in view stays until the next one arrives.
  const page = useHuntTrials(benchmarkId, hunt.id, useDeferredValue(query), HUNT_TRIAL_PAGE_SIZE);
  const last = Math.min(query.offset + HUNT_TRIAL_PAGE_SIZE, page.total);
  return (
    <section className={styles.section}>
      <h2 className="t-heading">{t('console.analysis.trials')}</h2>
      <div className={styles.filters}>
        <Select
          label={t('console.analysis.facetFilter')} value={query.facet ?? EVERY_CHOICE} onChange={facet => onChange({ facet: facet === EVERY_CHOICE ? undefined : facet })}
          choices={[{ value: EVERY_CHOICE, label: t('console.analysis.everyFacet') }, ...hunt.facets.map(facet => ({ value: facet.id, label: facet.name }))]}
        />
        <Select
          variant="quiet" label={t('console.analysis.verdictFilter')} value={query.verdict ?? EVERY_CHOICE} onChange={verdict => onChange({ verdict: verdict === EVERY_CHOICE ? undefined : verdict as HuntVerdict })}
          choices={[{ value: EVERY_CHOICE, label: t('console.analysis.everyVerdict') }, ...consoleHuntVerdictValues.map(verdict => ({ value: verdict, label: t(`console.analysis.verdict.${verdict}`) }))]}
        />
      </div>
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.analysis.empty')}</p> : <HuntTrialTable benchmarkId={benchmarkId} hunt={hunt} trials={page.items} />}
      {page.total > HUNT_TRIAL_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.analysis.range', { from: query.offset + 1, to: last, total: page.total })} atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => onChange({ offset: query.offset - HUNT_TRIAL_PAGE_SIZE })} onNext={() => onChange({ offset: query.offset + HUNT_TRIAL_PAGE_SIZE })}
        />
      )}
    </section>
  );
}
