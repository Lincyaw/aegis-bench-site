import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Hunt, HuntFacet, RunHuntFinding } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { useLocale } from '../../i18n/localeContext';
import { dateTimeOf, groupedNumber } from '../../i18n/locales';
import { huntPath } from '../../routes/consoleAnalysis';
import { StatTile, StatTiles, Tag } from '../../ui/content';
import content from '../../ui/content.module.css';
import controls from '../../ui/controls.module.css';
import table from '../../ui/table.module.css';
import { formatRate } from '../result/presentation';
import styles from './Hunt.module.css';

export function HuntCard({ benchmarkId, hunt }: { benchmarkId: string; hunt: Hunt }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <li>
      <LocaleLink className={clsx(content.panel, styles.hunt)} to={huntPath(benchmarkId, hunt.id)}>
        <span className={styles.huntHead}>
          <span className="t-heading">{hunt.title}</span>
          <Tag dashed={!hunt.converged}>{hunt.converged ? t('console.analysis.converged') : t('console.analysis.open')}</Tag>
          <span className="t-micro c-faint">{t('console.analysis.rounds', { count: hunt.rounds })} · {t('console.analysis.recordedAt', { at: dateTimeOf(locale, hunt.recordedAt) })}</span>
        </span>
        <span className="t-body">{hunt.need}</span>
        <span className="t-small c-muted">
          {t('console.analysis.figures', { trajectories: hunt.coverage.trajectories, read: hunt.coverage.read, marked: hunt.coverage.marked, found: hunt.found })}
        </span>
        <span className={styles.facetNames}>{hunt.facets.map(facet => <Tag key={facet.id}>{facet.name}</Tag>)}</span>
      </LocaleLink>
    </li>
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

export function HuntFinding({ finding, onStep }: { finding: RunHuntFinding; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  return (
    <section className={clsx(content.panel, styles.finding)}>
      <header className={styles.huntHead}>
        <h2 className="t-heading">{finding.title}</h2>
        <Tag dashed={finding.verdict === 'unread'}>{t(`console.analysis.verdict.${finding.verdict}`)}</Tag>
      </header>
      <p className="t-small c-muted">{finding.need}</p>
      {finding.why && <p className="t-body"><span className="t-micro c-faint">{t('console.analysis.why')} · </span>{finding.why}</p>}
      {finding.facets.map(facet => (
        <div key={facet.facetId} className={styles.findingFacet}>
          <span className={styles.facetHead}><span className="t-label">{facet.name}</span><Tag dashed={!facet.confirmed}>{facet.confirmed ? t('console.analysis.verdict.confirmed') : t('console.analysis.verdict.unread')}</Tag></span>
          <p className="t-micro c-faint">{facet.definition}</p>
          {facet.marks.length === 0 ? <p className="t-micro c-muted">{t('console.analysis.noMarks')}</p> : (
            <ol className={styles.marks} aria-label={t('console.analysis.marks')}>
              {facet.marks.map(mark => (
                <li key={mark.step} className={styles.mark}>
                  <button type="button" className={clsx(controls.textLink, 't-micro')} onClick={() => onStep(mark.step)}>{t('console.analysis.step', { step: mark.step })}</button>
                  <Tag>{t(`console.run.events.kind.${mark.kind}`)}</Tag>
                  <span className={clsx(styles.excerpt, 't-small')}>{mark.tool && <span className="t-mono c-muted">{mark.tool} · </span>}{mark.excerpt}</span>
                  <span className="t-mono c-faint">{dateTimeOf(locale, mark.at)}</span>
                  <span className={clsx(styles.markProbes, 't-micro c-faint')}>{t('console.analysis.probes', { probes: mark.probes.join('、') })}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </section>
  );
}
