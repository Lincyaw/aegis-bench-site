import type { ConsoleModelDetail, ConsoleModelResult, Locale, ModelTaskRow, ResultCounts, TaskOrder, TaskSpread } from '../api/types';
import { benchmarkOf, benchmarkRef, taskRefOf } from './benchmarks';
import { harnessRef, modelRef } from './catalog';
import { matchesTaskSearch, sortedTasks, spreadOf } from './consoleTasks';
import type { RunFact } from './records';
import { rankingOf, resultCountsOf } from './results';

/*
 * The console's view of the models that ran on a benchmark: each over every harness it ran in, with each harness, and
 * task by task.
 */

/** Tasks per page of a model's task list when a request names no limit, as the spec declares. */
export const DEFAULT_MODEL_TASK_PAGE_SIZE = 20;

/** Whether a model ran on a benchmark. */
export function ranOn(benchmarkId: string, modelId: string): boolean {
  return rankingOf(benchmarkId).some(ranked => ranked.modelId === modelId);
}

/** The harnesses a model ran in on a benchmark, in ranking order. */
export function harnessIdsOf(benchmarkId: string, modelId: string): string[] {
  return rankingOf(benchmarkId).filter(ranked => ranked.modelId === modelId).map(ranked => ranked.harnessId);
}

/** Every model among a benchmark's runs, over the harnesses it ran in, best pass rate first. */
export function modelResultsOver(benchmarkId: string, facts: readonly RunFact[], locale: Locale): ConsoleModelResult[] {
  const byModel = Map.groupBy(facts, fact => fact.modelId);
  return [...byModel].map(([modelId, facts]) => ({
    model: modelRef(modelId, locale), harnesses: harnessIdsOf(benchmarkId, modelId).map(harnessId => harnessRef(harnessId, locale)), result: resultCountsOf(facts),
  })).sort((a, b) => (b.result.passRate ?? -1) - (a.result.passRate ?? -1));
}

export function modelDetailOf(benchmarkId: string, modelId: string, locale: Locale): ConsoleModelDetail {
  const facts = benchmarkOf(benchmarkId).runs.filter(fact => fact.modelId === modelId);
  return {
    model: modelRef(modelId, locale), benchmark: benchmarkRef(benchmarkId), result: resultCountsOf(facts),
    byHarness: harnessIdsOf(benchmarkId, modelId)
      .map(harnessId => ({ harness: harnessRef(harnessId, locale), result: resultCountsOf(facts.filter(fact => fact.harnessId === harnessId)) }))
      .sort((a, b) => (b.result.passRate ?? -1) - (a.result.passRate ?? -1)),
  };
}

export interface ModelTaskFilter {
  /** Only the runs in this harness; every harness when empty */
  harness: string;

  q: string;
  spread?: TaskSpread;
  order: TaskOrder;
}

/** A model's tasks as the filter selects them, each with its runs and what they come to, and the totals over them all. */
export function modelTasksOf(benchmarkId: string, modelId: string, filter: ModelTaskFilter, locale: Locale): { rows: ModelTaskRow[]; totals: ResultCounts } {
  const facts = benchmarkOf(benchmarkId).runs.filter(fact => fact.modelId === modelId && (!filter.harness || fact.harnessId === filter.harness));
  const rows = [...Map.groupBy(facts, fact => fact.taskId).values()].map((runs: RunFact[]): ModelTaskRow => {
    const result = resultCountsOf(runs);
    const spread = spreadOf(result);
    return {
      task: taskRefOf(benchmarkId, runs[0].taskId), result, ...(spread && { spread }),
      runs: runs.map(fact => ({ id: fact.id, harness: harnessRef(fact.harnessId, locale), attempt: fact.attempt, outcome: fact.outcome, ...(fact.failureClass && { failureClass: fact.failureClass }) })),
    };
  });
  const matching = rows.filter(row => matchesTaskSearch(row.task, filter.q) && (!filter.spread || row.spread === filter.spread));
  const listed = new Set(matching.map(row => row.task.id));
  return {
    rows: sortedTasks(matching, filter.order, row => row.task.id, row => row.result.passRate),
    totals: resultCountsOf(facts.filter(fact => listed.has(fact.taskId))),
  };
}
