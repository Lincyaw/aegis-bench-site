import { useTranslation } from 'react-i18next';
import type { Hunt, HuntTrial } from '../../api/types';
import { LocaleLink } from '../../i18n/LocaleRouting';
import { consoleRunPath } from '../../routes/consoleRuns';
import { Tag } from '../../ui/content';
import { TextLink } from '../../ui/controls';
import table from '../../ui/table.module.css';
import { ModelLabel } from '../model/ModelBadge';
import styles from './HuntTrials.module.css';

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
        {trial.firstStep !== undefined && <TextLink className="t-micro" to={consoleRunPath(benchmarkId, run.id, { tab: 'trajectory', step: trial.firstStep })}>{t('console.analysis.step', { step: trial.firstStep })}</TextLink>}
      </span>
    </div>
  );
}
