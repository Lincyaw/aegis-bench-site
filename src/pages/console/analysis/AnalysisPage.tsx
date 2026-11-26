import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useHunts } from '../../../api/consoleClient';
import type { Hunt } from '../../../api/types';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { LocaleLink } from '../../../i18n/LocaleRouting';
import { useLocale } from '../../../i18n/localeContext';
import { dateTimeOf } from '../../../i18n/locales';
import { consoleBenchmarkPath } from '../../../routes/console';
import { huntPath } from '../../../routes/consoleAnalysis';
import { Tag } from '../../../ui/content';
import content from '../../../ui/content.module.css';
import styles from './AnalysisPages.module.css';

/** The hunts recorded over a benchmark's trajectories, each with its question and what it found. */
export function AnalysisPage() {
  const { t } = useTranslation();
  const { benchmarkId = '' } = useParams();
  const benchmark = useConsoleBenchmark(benchmarkId);
  const hunts = useHunts(benchmark.id);
  return (
    <div className={styles.page} data-half={benchmark.stage.half}>
      <ConsoleHeader crumbs={[{ label: benchmark.name, to: consoleBenchmarkPath(benchmark.id) }, { label: t('console.analysis.title') }]} title={t('console.analysis.title')} lead={t('console.analysis.lead')} />
      <ul className={styles.hunts}>
        {hunts.map(hunt => <HuntCard key={hunt.id} benchmarkId={benchmark.id} hunt={hunt} />)}
      </ul>
    </div>
  );
}

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
