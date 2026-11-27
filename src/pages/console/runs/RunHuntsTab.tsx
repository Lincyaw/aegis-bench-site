import { useTranslation } from 'react-i18next';
import { useRunHunts } from '../../../api/consoleClient';
import type { ConsoleRunDetail } from '../../../api/types';
import { HuntFinding } from '../../../components/hunt/Hunt';
import { consoleRunPath, type ConsoleRunView } from '../../../routes/consoleRuns';
import { ScopeChip } from '../../../ui/controls';
import styles from './RunDetailPage.module.css';

/**
 * What the hunts found in one run: the reader's verdict and reason, and the steps the probes marked, which open in the
 * trajectory. A run opened from one hunt shows that hunt's findings alone, with a chip that lets the others back in.
 */
export function RunHuntsTab({ benchmarkId, run, view, onStep }: { benchmarkId: string; run: ConsoleRunDetail; view: ConsoleRunView; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const findings = useRunHunts(run.id);
  const scoped = view.hunt === undefined ? findings : findings.filter(finding => finding.huntId === view.hunt);
  if (view.hunt !== undefined && scoped.length === 0) {
    throw new Error(`no hunt ${view.hunt} read run ${run.id}`);
  }
  return (
    <div className={styles.findings}>
      {view.hunt !== undefined && <span className={styles.scope}><ScopeChip name={scoped[0].title} to={consoleRunPath(benchmarkId, run.id, { ...view, hunt: undefined })} /></span>}
      {scoped.length === 0
        ? <p className="t-small c-muted">{t('console.analysis.runEmpty')}</p>
        : scoped.map(finding => <HuntFinding key={finding.huntId} finding={finding} onStep={onStep} />)}
    </div>
  );
}
