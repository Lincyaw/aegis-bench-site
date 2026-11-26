import { useSearchParams } from 'react-router-dom';
import { useConsoleTaskComparison, useConsoleTrajectories, useTaskResults } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import type { ComparisonSource } from '../../../components/comparison/comparison';
import { RunComparison, TaskInput } from '../../../components/comparison/TaskComparison';
import { COMPARISON_NAVIGATE_OPTIONS, type ComparisonView } from '../../../routes/comparison';
import { consoleRunPath } from '../../../routes/consoleRuns';
import { inScope, taskPageSearch, type TaskPageView } from '../../../routes/consoleTasks';
import styles from './TaskComparisonTab.module.css';

/**
 * A task's runs side by side, for checking the task: the input every run received, then what each run produced, how
 * it was graded and what it did, as the benchmark's blocks lay them out; a row opens in place to show all of it.
 */
export function TaskComparisonTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const [, setParams] = useSearchParams();
  // The runs to choose from are those of the combinations the page keeps to.
  const entrants = useTaskResults(task.benchmark.id, task.id).entrants.filter(entrant => inScope(view, entrant));
  const onView = (next: ComparisonView) => setParams(taskPageSearch({ ...view, ...next, tab: 'compare' }), COMPARISON_NAVIGATE_OPTIONS);
  const useTaskComparison = (runIds: string[]) => useConsoleTaskComparison(task.benchmark.id, task.id, runIds);
  const source: ComparisonSource = { useComparison: useTaskComparison, useTrajectories: useConsoleTrajectories, runPath: runId => consoleRunPath(task.benchmark.id, runId) };
  return (
    <div className={styles.tab}>
      <TaskInput instruction={task.instruction} reportSchema={task.reportSchema} />
      <RunComparison entrants={entrants} source={source} view={view} onView={onView} />
    </div>
  );
}
