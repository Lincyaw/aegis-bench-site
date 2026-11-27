import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRun, useTrajectoryPage, type TimelineLegend } from '../../../api/client';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { RunHeader } from '../../../components/run/RunDetail';
import { RunTabRow, RunViewTab } from '../../../components/run/RunTabs';
import type { TrajectorySource } from '../../../components/trajectory/TrajectoryView';
import { RUN_TABS, defaultRunTab, type RunView } from '../../../routes/runRecords';
import { taskFilesPath } from '../../../routes/site';
import { Loading } from '../../../ui/content';
import styles from './RunDetailPanel.module.css';

/** One run's five views: what the model received, what it produced, how it was graded, why it failed and its trajectory. */
export function RunDetailPanel({ runId, legend, view, onView }: { runId: string; legend: TimelineLegend; view: Partial<RunView>; onView: (view: RunView) => void }) {
  const { t } = useTranslation();
  const run = useRun(runId);
  const tab = view.tab ?? defaultRunTab(run);
  const source: TrajectorySource = { usePage: (offset, pageSize) => useTrajectoryPage(runId, offset, pageSize) };
  return (
    <div className={styles.root}>
      <RunHeader run={run} />
      <RunTabRow
        run={run} tabs={RUN_TABS} current={tab} className={styles.tabs} label={t('runs.detailLabel')} labelOf={item => t(`runs.tab.${item}`)}
        onSelect={item => onView({ tab: item })}
      />
      <div className={styles.content} role="tabpanel">
        <HuggingFaceBoundary resetKey={runId}>
          <Suspense fallback={<Loading />}>
            <RunViewTab
              run={run} tab={tab} view={view} legend={legend} source={source} onView={onView}
              filePath={path => taskFilesPath(run.benchmark.id, run.task.id, path)}
            />
          </Suspense>
        </HuggingFaceBoundary>
      </div>
    </div>
  );
}
