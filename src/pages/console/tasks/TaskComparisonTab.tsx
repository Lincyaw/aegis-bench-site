import { useSearchParams } from 'react-router-dom';
import { useConsoleTaskComparison, useConsoleTrajectories, useTaskResults } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import type { ComparisonSource } from '../../../components/comparison/comparison';
import { RunComparison, TaskInput } from '../../../components/comparison/TaskComparison';
import { searchOf } from '../../../routes/address';
import { COMPARISON_NAVIGATE_OPTIONS, intentsOf } from '../../../routes/comparison';
import { consoleRunPath } from '../../../routes/consoleRuns';
import { TASK_PAGE_PARAMS, type TaskPageView } from '../../../routes/consoleTasks';
import styles from './TaskComparisonTab.module.css';

/**
 * A task's runs side by side, for checking the task: the input every run received, then what each run produced, how
 * it was graded and what it did, as the benchmark's blocks lay them out; a row opens in place to show all of it. The
 * runs to choose from are those of the combinations the page keeps to.
 */
export function TaskComparisonTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const [, setParams] = useSearchParams();
  const { entrants } = useTaskResults(task.benchmark.id, task.id, view);
  const intents = intentsOf(view, next => setParams(searchOf(TASK_PAGE_PARAMS, { ...next, tab: 'compare' }), COMPARISON_NAVIGATE_OPTIONS));
  const useTaskComparison = (runIds: string[]) => useConsoleTaskComparison(task.benchmark.id, task.id, runIds);
  const source: ComparisonSource = { useComparison: useTaskComparison, useTrajectories: useConsoleTrajectories, runPath: runId => consoleRunPath(task.benchmark.id, runId) };
  return (
    <div className={styles.tab}>
      <TaskInput instruction={task.instruction} reportSchema={task.reportSchema} />
      <RunComparison entrants={entrants} source={source} view={view} intents={intents} />
    </div>
  );
}
