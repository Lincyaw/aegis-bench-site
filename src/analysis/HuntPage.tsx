import { clsx } from 'clsx';
import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { useConsoleBenchmark, useHuntTrials, useHunts, type HuntTrialQuery } from '../api/consoleClient';
import { consoleHuntVerdictValues } from '../api/schema';
import type { Hunt, HuntFacet, HuntTrial, HuntVerdict } from '../api/types';
import { ConsoleHeader } from '../console/ConsoleHeader';
import { EVERY_CHOICE, consoleBenchmarkPath } from '../console/consoleMap';
import { LocaleLink } from '../i18n/LocaleRouting';
import { useLocale } from '../i18n/localeContext';
import { groupedNumber } from '../i18n/locales';
import { ModelLabel } from '../models/ModelBadge';
import { formatRate } from '../results/presentation';
import { consoleRunPath } from '../runs/consoleRunQuery';
import { StatTile, StatTiles, Tag } from '../ui/content';
import content from '../ui/content.module.css';
import { Select } from '../ui/controls';
import { Pager } from '../ui/navigation';
import table from '../ui/table.module.css';
import { HUNT_TRIAL_PAGE_SIZE, analysisPath, huntTrialSearch, parseHuntTrialQuery } from './analysisQuery';
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
  const update = (next: Partial<HuntTrialQuery>) => setParams(huntTrialSearch({ ...query, offset: 0, ...next }), { replace: true, preventScrollReset: true });
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader
        crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.analysis.title'), to: analysisPath(benchmark.id) }, { label: hunt.title }]}
        title={hunt.title} lead={hunt.need}
      />
      <HuntCoverageTiles hunt={hunt} />
      <section className={styles.section}>
        <h2 className="t-heading">{t('console.analysis.facets')}</h2>
        {hunt.facets.map(facet => <FacetPanel key={facet.id} facet={facet} onTrials={() => update({ facet: facet.id })} />)}
        <p className="t-micro c-faint">{t('console.analysis.precisionNote')}</p>
      </section>
      <HuntTrials benchmarkId={benchmark.id} hunt={hunt} query={query} onChange={update} />
    </div>
  );
}

export function HuntCoverageTiles({ hunt }: { hunt: Hunt }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { coverage, calibration } = hunt;
  return (
    <>
      <StatTiles>
        <StatTile label={t('console.analysis.stats.found')} value={groupedNumber(locale, hunt.found)} note={t('console.analysis.stats.foundNote')} />
        <StatTile label={t('console.analysis.stats.read')} value={groupedNumber(locale, coverage.read)} note={t('console.analysis.stats.readNote', { trajectories: coverage.trajectories })} />
        <StatTile label={t('console.analysis.stats.marked')} value={groupedNumber(locale, coverage.marked)} />
        <StatTile
          label={t('console.analysis.stats.missUpper')} value={coverage.missShareUpper === undefined ? '—' : formatRate(coverage.missShareUpper)}
          note={t('console.analysis.stats.missNote', { reads: coverage.randomReads, finds: coverage.randomFinds })}
        />
      </StatTiles>
      {calibration.agreement !== undefined && <p className="t-small c-muted">{t('console.analysis.calibration', { pairs: calibration.pairs, agreement: formatRate(calibration.agreement) })}</p>}
    </>
  );
}

/** A kind of behaviour: what counts and what does not, how often it was confirmed and marked, and how its probes held up. */
export function FacetPanel({ facet, onTrials }: { facet: HuntFacet; onTrials: () => void }) {
  const { t } = useTranslation();
  return (
    <article className={clsx(content.panel, styles.facet)}>
      <header className={styles.facetHead}>
        <span className="t-label">{facet.name}</span>
        {facet.edge && <Tag>{t(`console.analysis.edge.${facet.edge}`)}</Tag>}
        <button type="button" className={clsx(styles.facetCounts, 't-micro')} onClick={onTrials}>{t('console.analysis.facetCounts', { found: facet.found, marked: facet.marked })} →</button>
      </header>
      <p className="t-small">{facet.definition}</p>
      <p className="t-micro c-faint">{t('console.analysis.excludes', { excludes: facet.excludes })}</p>
      <div className={clsx(table.table, styles.probes)} role="table" aria-label={facet.name}>
        <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
          <span role="columnheader">{t('console.analysis.probe.name')}</span>
          <span role="columnheader">{t('console.analysis.probe.kind')}</span>
          <span role="columnheader">{t('console.analysis.probe.hits')}</span>
          <span role="columnheader">{t('console.analysis.probe.read')}</span>
          <span role="columnheader">{t('console.analysis.probe.found')}</span>
          <span role="columnheader">{t('console.analysis.probe.precision')}</span>
          <span role="columnheader">{t('console.analysis.probe.unread')}</span>
        </div>
        {facet.probes.map(probe => (
          <div key={probe.name} className={table.row} role="row">
            <span role="cell" className="t-mono">{probe.name}</span>
            <span role="cell" className="t-small c-muted">{probe.kind}</span>
            <span role="cell" className="t-numeric">{probe.hits}</span>
            <span role="cell" className="t-numeric c-muted">{probe.read}</span>
            <span role="cell" className="t-numeric c-muted">{probe.found}</span>
            <span role="cell" className="t-numeric">
              {probe.precision === undefined || !probe.precisionInterval ? '—' : t('console.analysis.precision', {
                value: formatRate(probe.precision), lower: formatRate(probe.precisionInterval[0]), upper: formatRate(probe.precisionInterval[1]),
              })}
            </span>
            <span role="cell" className="t-numeric c-muted">{probe.unread}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

/** The trajectories the hunt marked or read, confirmed ones first; each opens its run's trajectory at the first mark. */
export function HuntTrials({ benchmarkId, hunt, query, onChange }: { benchmarkId: string; hunt: Hunt; query: HuntTrialQuery; onChange: (next: Partial<HuntTrialQuery>) => void }) {
  const { t } = useTranslation();
  // The page in view stays until the next one arrives.
  const page = useHuntTrials(benchmarkId, hunt.id, useDeferredValue(query), HUNT_TRIAL_PAGE_SIZE);
  const last = Math.min(query.offset + HUNT_TRIAL_PAGE_SIZE, page.total);
  return (
    <section className={styles.section}>
      <h2 className="t-heading">{t('console.analysis.trials')}</h2>
      <div className={styles.filters}>
        <Select
          label={t('console.analysis.facetFilter')} value={query.facet || EVERY_CHOICE} onChange={facet => onChange({ facet: facet === EVERY_CHOICE ? '' : facet })}
          choices={[{ value: EVERY_CHOICE, label: t('console.analysis.everyFacet') }, ...hunt.facets.map(facet => ({ value: facet.id, label: facet.name }))]}
        />
        <Select
          label={t('console.analysis.verdictFilter')} value={query.verdict ?? EVERY_CHOICE} onChange={verdict => onChange({ verdict: verdict === EVERY_CHOICE ? undefined : verdict as HuntVerdict })}
          choices={[{ value: EVERY_CHOICE, label: t('console.analysis.everyVerdict') }, ...consoleHuntVerdictValues.map(verdict => ({ value: verdict, label: t(`console.analysis.verdict.${verdict}`) }))]}
        />
      </div>
      {page.items.length === 0 ? <p className="t-small c-muted">{t('console.analysis.empty')}</p> : (
        <div className={clsx(table.table, styles.trials)} role="table" aria-label={t('console.analysis.trials')}>
          <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
            <span role="columnheader">{t('console.analysis.column.run')}</span>
            <span role="columnheader">{t('console.analysis.column.entrant')}</span>
            <span role="columnheader">{t('console.analysis.column.verdict')}</span>
            <span role="columnheader">{t('console.analysis.column.facets')}</span>
            <span role="columnheader">{t('console.analysis.column.marks')}</span>
            <span role="columnheader">{t('console.analysis.column.firstStep')}</span>
          </div>
          {page.items.map(trial => <HuntTrialRow key={trial.run.id} benchmarkId={benchmarkId} hunt={hunt} trial={trial} />)}
        </div>
      )}
      {page.total > HUNT_TRIAL_PAGE_SIZE && (
        <Pager
          className={styles.pager} label={t('console.analysis.range', { from: query.offset + 1, to: last, total: page.total })} atStart={query.offset === 0} atEnd={last >= page.total}
          onPrevious={() => onChange({ offset: query.offset - HUNT_TRIAL_PAGE_SIZE })} onNext={() => onChange({ offset: query.offset + HUNT_TRIAL_PAGE_SIZE })}
        />
      )}
    </section>
  );
}

export function HuntTrialRow({ benchmarkId, hunt, trial }: { benchmarkId: string; hunt: Hunt; trial: HuntTrial }) {
  const { t } = useTranslation();
  const { run } = trial;
  const nameOf = (facetId: string) => hunt.facets.find(facet => facet.id === facetId)?.name ?? facetId;
  const markedOnly = trial.markedFacets.filter(facetId => !trial.confirmedFacets.includes(facetId));
  return (
    <div className={table.row} role="row">
      <span role="cell" className={styles.run}>
        <LocaleLink to={consoleRunPath(benchmarkId, run.id, { tab: 'hunts' })} className="t-label">{run.task.title}</LocaleLink>
        <span className="t-mono c-faint">{run.task.id} · {t('console.runs.attempt', { attempt: run.attempt })}</span>
      </span>
      <span role="cell" className={styles.entrant}><ModelLabel model={run.model} /><span className="t-small c-muted">{run.harness.name}</span></span>
      <span role="cell"><Tag dashed={trial.verdict === 'unread'}>{t(`console.analysis.verdict.${trial.verdict}`)}</Tag></span>
      <span role="cell" className={styles.tags}>
        {trial.confirmedFacets.map(facetId => <Tag key={facetId}>{nameOf(facetId)}</Tag>)}
        {markedOnly.map(facetId => <Tag key={facetId} dashed>{nameOf(facetId)}</Tag>)}
      </span>
      <span role="cell" className="t-numeric c-muted">{trial.marks}</span>
      <span role="cell">
        {trial.firstStep !== undefined && <LocaleLink className="t-micro" to={consoleRunPath(benchmarkId, run.id, { tab: 'trajectory', step: trial.firstStep })}>{t('console.analysis.step', { step: trial.firstStep })} →</LocaleLink>}
      </span>
    </div>
  );
}
