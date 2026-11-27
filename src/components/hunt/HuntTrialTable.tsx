import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Hunt, HuntTrial } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { consoleRunPath } from '../../routes/consoleRuns';
import { Tag } from '../../ui/content';
import { TextLink } from '../../ui/controls';
import table from '../../ui/table.module.css';
import { ModelLabel } from '../model/ModelBadge';
import styles from './HuntTrialTable.module.css';

/** The trajectories a hunt marked or read, one row each; a row opens its run on this hunt's findings, and its first mark opens the trajectory. */
export function HuntTrialTable({ benchmarkId, hunt, trials }: { benchmarkId: string; hunt: Hunt; trials: HuntTrial[] }) {
  const { t } = useTranslation();
  return (
    <div className={clsx(table.table, styles.trials)} role="table" aria-label={t('console.analysis.trials')}>
      <div className={clsx(table.row, table.head, 't-micro c-faint')} role="row">
        <span role="columnheader">{t('console.analysis.column.run')}</span>
        <span role="columnheader">{t('console.analysis.column.entrant')}</span>
        <span role="columnheader">{t('console.analysis.column.verdict')}</span>
        <span role="columnheader">{t('console.analysis.column.facets')}</span>
        <span role="columnheader">{t('console.analysis.column.marks')}</span>
        <span role="columnheader">{t('console.analysis.column.firstStep')}</span>
      </div>
      {trials.map(trial => <HuntTrialRow key={trial.run.id} benchmarkId={benchmarkId} hunt={hunt} trial={trial} />)}
    </div>
  );
}

export function HuntTrialRow({ benchmarkId, hunt, trial }: { benchmarkId: string; hunt: Hunt; trial: HuntTrial }) {
  const { t } = useTranslation();
  const { run } = trial;
  const nameOf = (facetId: string) => {
    const facet = hunt.facets.find(candidate => candidate.id === facetId);
    if (!facet) {
      throw new Error(`The hunt ${hunt.id} has no facet ${facetId}`);
    }
    return facet.name;
  };
  const markedOnly = trial.markedFacets.filter(facetId => !trial.confirmedFacets.includes(facetId));
  return (
    <div className={table.row} role="row">
      <span role="cell" className={styles.run}>
        <LocaleLink to={consoleRunPath(benchmarkId, run.id, { tab: 'hunts', hunt: hunt.id })} className="t-label">{run.task.title}</LocaleLink>
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
        {trial.firstStep !== undefined && <TextLink className="t-micro" to={consoleRunPath(benchmarkId, run.id, { tab: 'trajectory', step: trial.firstStep })}>{t('console.analysis.step', { step: trial.firstStep })}</TextLink>}
      </span>
    </div>
  );
}
