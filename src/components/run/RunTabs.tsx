import type { RunDetail, TimelineLegend } from '../../api/types';
import type { RunTab, RunView } from '../../routes/runRecords';
import { Tab, TabRow } from '../../ui/navigation';
import { TrajectoryView, type TrajectorySource } from '../trajectory/TrajectoryView';
import { FailureTab, GradingTab, InputTab, OutputTab } from './RunDetail';

/** The tabs of a run with the size of what each holds; the public site shows the five views, the console adds its own. */
export function RunTabRow<Tabs extends string>({ run, tabs, current, label, labelOf, onSelect, className }: {
  run: RunDetail; tabs: readonly Tabs[]; current: Tabs; label: string; labelOf: (tab: Tabs) => string; onSelect: (tab: Tabs) => void; className?: string;
}) {
  const counts: Partial<Record<string, number>> = { grading: run.grading.total, failure: run.failure?.failedChecks.length, trajectory: run.metrics.steps };
  return (
    <TabRow current={current} className={className} role="tablist" aria-label={label}>
      {tabs.map(tab => <Tab key={tab} id={tab} current={current} count={counts[tab]} onSelect={() => onSelect(tab)}>{labelOf(tab)}</Tab>)}
    </TabRow>
  );
}

/** The content of one of a run's five views; the trajectory is the run's largest record, so it is read only when its tab opens. */
export function RunViewTab({ run, tab, view, legend, source, filePath, onView }: {
  run: RunDetail; tab: RunTab; view: Pick<Partial<RunView>, 'step' | 'check'>; legend: TimelineLegend; source: TrajectorySource; filePath: (path: string) => string; onView: (view: RunView) => void;
}) {
  const onStep = (step: number) => onView({ tab: 'trajectory', step });
  const onCheck = (check: string | undefined) => onView({ tab: 'grading', check });
  switch (tab) {
    case 'input': return <InputTab run={run} filePath={filePath} />;
    case 'output': return <OutputTab run={run} onStep={onStep} />;
    case 'grading': return <GradingTab run={run} filePath={filePath} check={view.check} onCheck={onCheck} />;
    case 'failure': return <FailureTab run={run} onCheck={onCheck} onStep={onStep} />;
    case 'trajectory': return (
      <TrajectoryView source={source} timeline={run.timeline} legend={legend} evidence={run.failure?.review?.evidenceSteps ?? []} selected={view.step} onSelect={step => onView({ tab: 'trajectory', step })} />
    );
  }
}
