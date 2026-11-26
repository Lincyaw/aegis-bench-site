import { Suspense, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConsoleTaskComparison, useConsoleTrajectories, useTaskResults } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import { ComparedRuns, RunChoice, TaskInput, type ComparisonSource } from '../../../components/comparison/TaskComparison';
import { HuggingFaceBoundary } from '../../../components/run/HuggingFace';
import { LIST_SEPARATOR, type ComparisonView } from '../../../routes/comparison';
import { consoleRunPath } from '../../../routes/consoleRuns';
import { inFocus, taskPageSearch, type TaskPageView } from '../../../routes/consoleTasks';
import { Loading } from '../../../ui/content';
import styles from './TaskComparisonTab.module.css';

/**
 * A task's runs side by side, for checking the task: the input every run received, then what each run produced, how
 * it was graded and what it did, as the benchmark's blocks lay them out; the runs opened below show all of it.
 */
export function TaskComparisonTab({ task, view }: { task: ConsoleTaskDetail; view: TaskPageView }) {
  const [, setParams] = useSearchParams();
  // The runs to choose from are those of the combinations the page keeps to.
  const entrants = useTaskResults(task.benchmark.id, task.id).entrants.filter(entrant => inFocus(view, entrant));
  // Choices show at once, outside the router's transition, so quick successive choices build on each other.
  const onView = (next: ComparisonView) => setParams(taskPageSearch({ ...view, ...next, tab: 'compare' }), { replace: true, preventScrollReset: true, flushSync: true });
  // The runs shown stay until the newly chosen ones load.
  const shown = useDeferredValue(view.runs.join(LIST_SEPARATOR));
  const useTaskComparison = (runIds: string[]) => useConsoleTaskComparison(task.benchmark.id, task.id, runIds);
  const source: ComparisonSource = { useComparison: useTaskComparison, useTrajectories: useConsoleTrajectories, runPath: runId => consoleRunPath(task.benchmark.id, runId) };
  return (
    <div className={styles.tab}>
      <TaskInput instruction={task.instruction} reportSchema={task.reportSchema} />
      {shown ? (
        <HuggingFaceBoundary resetKey={shown}>
          <Suspense fallback={<Loading />}>
            <ComparedRuns runIds={shown.split(LIST_SEPARATOR)} entrants={entrants} source={source} view={view} onView={onView} />
          </Suspense>
        </HuggingFaceBoundary>
      ) : <RunChoice entrants={entrants} view={view} onView={onView} />}
    </div>
  );
}
