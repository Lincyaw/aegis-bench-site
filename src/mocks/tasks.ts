import type { CombinationRuns, CombinationTaskRuns, EntrantKey, Locale, RunRef, TaskRecord, TaskSummary } from '../api/types';
import { benchmarkOf } from './benchmarks';
import { harnessRef, isSameCombination, modelRef } from './catalog';
import { huggingFacePageOf, taskDirectoryOf } from './records';
import { passRateOf, rankingOf } from './results';

/** The combinations that ran a task, in ranking order, each with its runs by attempt. */
export function taskRunRefsOf(benchmarkId: string, taskId: string): (EntrantKey & { runs: RunRef[] })[] {
  const facts = benchmarkOf(benchmarkId).runs.filter(fact => fact.taskId === taskId);
  return rankingOf(benchmarkId)
    .map(({ modelId, harnessId }) => ({
      modelId, harnessId,
      runs: facts.filter(fact => isSameCombination(fact, { modelId, harnessId })).toSorted((a, b) => a.attempt - b.attempt)
        .map(fact => ({ id: fact.id, attempt: fact.attempt, outcome: fact.outcome })),
    }))
    .filter(combination => combination.runs.length > 0);
}

/** A task's runs by combination, in ranking order, each combination's by attempt and with its pass rate. */
export function taskRunsOf(benchmarkId: string, taskId: string, locale: Locale): CombinationRuns[] {
  return taskRunRefsOf(benchmarkId, taskId).map(({ modelId, harnessId, runs }) => {
    const passRate = passRateOf(runs);
    return { model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale), runs, ...(passRate !== undefined && { passRate }) };
  });
}

/**
 * Rows kept to their runs of one outcome, leaving out the rows without any, as a list with the spec's OutcomeQuery
 * answers; every row as it is when the request asks for no outcome. Rates computed before stay over all the runs.
 */
export function keepingOutcome<Row extends { runs: RunRef[] }>(rows: Row[], outcome: string | null): Row[] {
  return outcome === null ? rows : rows.map(row => ({ ...row, runs: row.runs.filter(run => run.outcome === outcome) })).filter(row => row.runs.length > 0);
}

/** A task's summary with its pass rate over the given runs. */
export function taskSummaryOf(benchmarkId: string, task: TaskRecord, runs: RunRef[]): TaskSummary {
  const huggingFaceUrl = huggingFacePageOf(benchmarkOf(benchmarkId).record, taskDirectoryOf(task.id));
  const passRate = passRateOf(runs);
  return { id: task.id, title: task.title, ...(passRate !== undefined && { passRate }), ...(huggingFaceUrl && { huggingFaceUrl }) };
}

/** A combination's runs of each task it ran, in the benchmark's task order, each by attempt. */
export function combinationTasksOf(benchmarkId: string, modelId: string, harnessId: string): CombinationTaskRuns[] {
  const { tasks, runs } = benchmarkOf(benchmarkId);
  return tasks
    .map(task => {
      const taskRuns = runs.filter(fact => fact.taskId === task.id && isSameCombination(fact, { modelId, harnessId }))
        .toSorted((a, b) => a.attempt - b.attempt).map(fact => ({ id: fact.id, attempt: fact.attempt, outcome: fact.outcome }));
      return { task: taskSummaryOf(benchmarkId, task, taskRuns), runs: taskRuns };
    })
    .filter(row => row.runs.length > 0);
}
