import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useConsoleBenchmark, useHunts } from '../../../api/consoleClient';
import { HuntCard } from '../../../components/hunt/Hunt';
import { ConsoleHeader } from '../../../components/shell/ConsoleHeader';
import { consoleBenchmarkPath } from '../../../routes/console';
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
