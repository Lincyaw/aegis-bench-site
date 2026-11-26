import { clsx } from 'clsx';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useRun, useTrajectoryPage, type TimelineLegend } from '../../../api/client';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { FailureTab, GradingTab, InputTab, OutputTab, RunHeader } from '../../../components/run/RunDetail';
import { TrajectoryView } from '../../../components/trajectory/TrajectoryView';
import { RUN_TABS, defaultRunTab, type RunTab } from '../../../routes/runRecords';
import { taskFilesPath } from '../../../routes/site';
import { Loading } from '../../../ui/content';
import navigation from '../../../ui/navigation.module.css';
import { TabRow } from '../../../ui/navigation';
import styles from './RunDetailPanel.module.css';

/** Which view of a run is shown: its tab and, within it, the step or check it opens. */
export interface RunView {
  tab: RunTab;
  step?: number;
  check?: string;
}

/**
 * One run's five views: what the model received, what it produced, how it was graded, why it failed and its
 * trajectory. The trajectory is the run's largest record, so it is fetched only when its tab opens.
 */
export function RunDetailPanel({ runId, legend, view, onView }: { runId: string; legend: TimelineLegend; view: Partial<RunView>; onView: (view: RunView) => void }) {
  const { t } = useTranslation();
  const run = useRun(runId);
  const tab = view.tab ?? defaultRunTab(run);
  const filePath = (path: string) => taskFilesPath(run.benchmark.id, run.task.id, path);
  const usePublicTrajectoryPage = (offset: number, pageSize: number) => useTrajectoryPage(runId, offset, pageSize);
  const counts: Partial<Record<RunTab, number>> = { grading: run.grading.total, failure: run.failure?.failedChecks.length, trajectory: run.metrics.steps };
  return (
    <div className={styles.root}>
      <RunHeader run={run} />
      <TabRow current={tab} className={styles.tabs} role="tablist" aria-label={t('runs.detailLabel')}>
        {RUN_TABS.map(item => (
          <button key={item} type="button" role="tab" data-tab={item} aria-selected={item === tab} className={clsx(navigation.tab, 't-small')} onClick={() => onView({ tab: item })}>
            {t(`runs.tab.${item}`)}{counts[item] !== undefined && <span className="t-micro c-faint"> {counts[item]}</span>}
          </button>
        ))}
      </TabRow>
      <div className={styles.content} role="tabpanel">
        {tab === 'input' && <InputTab run={run} filePath={filePath} />}
        {tab === 'output' && <OutputTab run={run} onStep={step => onView({ tab: 'trajectory', step })} />}
        {tab === 'grading' && <GradingTab run={run} filePath={filePath} check={view.check} onCheck={check => onView({ tab: 'grading', check })} />}
        {tab === 'failure' && <FailureTab run={run} onCheck={check => onView({ tab: 'grading', check })} onStep={step => onView({ tab: 'trajectory', step })} />}
        {tab === 'trajectory' && (
          <HuggingFaceBoundary resetKey={runId}>
            <Suspense fallback={<Loading />}>
              <TrajectoryView
                usePage={usePublicTrajectoryPage} timeline={run.timeline} legend={legend}
                evidence={run.failure?.review?.evidenceSteps ?? []} selected={view.step} onSelect={step => onView({ tab: 'trajectory', step })}
              />
            </Suspense>
          </HuggingFaceBoundary>
        )}
      </div>
    </div>
  );
}
