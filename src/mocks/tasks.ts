import type { CombinationRuns, Locale, TaskSummary } from '../api/types';
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
export function passRateOf(combinations: CombinationRuns[]): number {
  const counted = combinations.flatMap(combination => combination.runs).filter(run => run.outcome !== 'executionFailed');
  return counted.filter(run => run.outcome === 'passed').length / counted.length;
}

const summaryCache = new Map<string, TaskSummary[]>();

export function taskSummariesOf(benchmarkId: string): TaskSummary[] {
  const cached = summaryCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const { record, tasks } = benchmarkOf(benchmarkId);
  const summaries = tasks.map(task => {
    const huggingFaceUrl = huggingFacePageOf(record, taskDirectoryOf(task.id));
    return { id: task.id, title: task.title, passRate: passRateOf(taskRunsOf(benchmarkId, task.id, RECORD_LOCALE)), ...(huggingFaceUrl && { huggingFaceUrl }) };
  });
  summaryCache.set(benchmarkId, summaries);
  return summaries;
}
