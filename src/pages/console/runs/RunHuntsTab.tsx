import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useRunHunts } from '../../../api/consoleClient';
import type { RunHuntFinding } from '../../../api/types';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { Tag } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import controls from '../../../ui/controls.module.css';
import styles from '../analysis/AnalysisPages.module.css';

/** What every hunt found in one run: the reader's verdict and reason, and the steps the probes marked, which open in the trajectory. */
export function RunHuntsTab({ runId, onStep }: { runId: string; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const findings = useRunHunts(runId);
  return findings.length === 0
    ? <p className="t-small c-muted">{t('console.analysis.runEmpty')}</p>
    : <div className={styles.findings}>{findings.map(finding => <HuntFinding key={finding.huntId} finding={finding} onStep={onStep} />)}</div>;
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
