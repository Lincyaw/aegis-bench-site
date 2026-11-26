import { useTaskGrading, useTaskReference } from '../../../api/consoleClient';
import type { ConsoleTaskDetail } from '../../../api/types';
import { TaskGradingDetail, TaskReferenceFiles } from '../../../components/task/TaskContent';

export function TaskGradingTab({ task }: { task: ConsoleTaskDetail }) {
  const grading = useTaskGrading(task.benchmark.id, task.id);
  return <TaskGradingDetail grading={grading} />;
}

export function TaskReferenceTab({ task }: { task: ConsoleTaskDetail }) {
  const files = useTaskReference(task.benchmark.id, task.id);
  return <TaskReferenceFiles files={files} />;
}
