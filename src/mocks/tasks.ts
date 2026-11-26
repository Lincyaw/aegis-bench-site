import type { CombinationRuns, CombinationTaskRuns, Locale, RunRef, TaskRecord, TaskSummary } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { RECORD_LOCALE, harnessRef, modelRef } from './catalog';
import { huggingFacePageOf, taskDirectoryOf } from './records';
import { rankingOf } from './results';

/** The page size the task list answers with when the request names none, as the API declares. */
export const DEFAULT_TASK_PAGE_SIZE = 14;

/** A task's runs by combination, in ranking order, each combination's by attempt. */
export function taskRunsOf(benchmarkId: string, taskId: string, locale: Locale): CombinationRuns[] {
  const runs = benchmarkOf(benchmarkId).runs.filter(fact => fact.taskId === taskId);
  return rankingOf(benchmarkId)
    .map(({ modelId, harnessId }) => ({
      model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale),
      runs: runs.filter(fact => fact.modelId === modelId && fact.harnessId === harnessId).toSorted((a, b) => a.attempt - b.attempt)
        .map(fact => ({ id: fact.id, attempt: fact.attempt, outcome: fact.outcome })),
    }))
    .filter(combination => combination.runs.length > 0);
}

/** Share of passed runs among the runs that count; execution failures are not model results. */
export function passRateOf(runs: RunRef[]): number {
  const counted = runs.filter(run => run.outcome !== 'executionFailed');
  return counted.filter(run => run.outcome === 'passed').length / counted.length;
}

/** A task's summary with its pass rate over the given runs. */
export function taskSummaryOf(benchmarkId: string, task: TaskRecord, runs: RunRef[]): TaskSummary {
  const huggingFaceUrl = huggingFacePageOf(benchmarkOf(benchmarkId).record, taskDirectoryOf(task.id));
  return { id: task.id, title: task.title, passRate: passRateOf(runs), ...(huggingFaceUrl && { huggingFaceUrl }) };
}

const summaryCache = new Map<string, TaskSummary[]>();

export function taskSummariesOf(benchmarkId: string): TaskSummary[] {
  const cached = summaryCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const summaries = benchmarkOf(benchmarkId).tasks.map(task => taskSummaryOf(benchmarkId, task, taskRunsOf(benchmarkId, task.id, RECORD_LOCALE).flatMap(combination => combination.runs)));
  summaryCache.set(benchmarkId, summaries);
  return summaries;
}

/** A combination's runs of each task it ran, in the benchmark's task order, each by attempt. */
export function combinationTasksOf(benchmarkId: string, modelId: string, harnessId: string): CombinationTaskRuns[] {
  const { tasks, runs } = benchmarkOf(benchmarkId);
  return tasks
    .map(task => {
      const taskRuns = runs.filter(fact => fact.taskId === task.id && fact.modelId === modelId && fact.harnessId === harnessId)
        .toSorted((a, b) => a.attempt - b.attempt).map(fact => ({ id: fact.id, attempt: fact.attempt, outcome: fact.outcome }));
      return { task: taskSummaryOf(benchmarkId, task, taskRuns), runs: taskRuns };
    })
    .filter(row => row.runs.length > 0);
}
