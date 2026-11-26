import { useTranslation } from 'react-i18next';
import { useRunHunts } from '../../../api/consoleClient';
import { HuntFinding } from '../../../components/hunt/Hunt';
import styles from '../analysis/AnalysisPages.module.css';

/** What every hunt found in one run: the reader's verdict and reason, and the steps the probes marked, which open in the trajectory. */
export function RunHuntsTab({ runId, onStep }: { runId: string; onStep: (step: number) => void }) {
  const { t } = useTranslation();
  const findings = useRunHunts(runId);
  return findings.length === 0
    ? <p className="t-small c-muted">{t('console.analysis.runEmpty')}</p>
    : <div className={styles.findings}>{findings.map(finding => <HuntFinding key={finding.huntId} finding={finding} onStep={onStep} />)}</div>;
}
