import type { ConsoleModelDetail, ConsoleModelResult, Locale, ModelTaskRow, ResultCounts, TaskOrder, TaskSpread } from '../api/types';
import { benchmarkById, benchmarkRef } from './benchmarks';
import { harnessRef, modelRef } from './catalog';
import { matchesTaskSearch, sortedTasks, spreadOf } from './consoleTasks';
import { resultCountsOf } from './results';
import { runFactsOf, type RunFact } from './runIndex';

/*
 * The console's view of the models that ran on a benchmark: each over every harness it ran in, with each harness, and
 * task by task.
 */

/** Tasks per page of a model's task list when a request names no limit, as the spec declares. */
export const DEFAULT_MODEL_TASK_PAGE_SIZE = 20;

/** Whether a model ran on a benchmark. */
export function ranOn(benchmarkId: string, modelId: string): boolean {
  return benchmarkById(benchmarkId).ranking.some(([rankedModel]) => rankedModel === modelId);
}

/** The harnesses a model ran in on a benchmark, in ranking order. */
export function harnessIdsOf(benchmarkId: string, modelId: string): string[] {
  return benchmarkById(benchmarkId).ranking.filter(([rankedModel]) => rankedModel === modelId).map(([, harnessId]) => harnessId);
}

/** Every model that ran on a benchmark, best pass rate first. */
export function modelResultsOf(benchmarkId: string, locale: Locale): ConsoleModelResult[] {
  const byModel = Map.groupBy(runFactsOf(benchmarkId), fact => fact.key.modelId);
  return [...byModel].map(([modelId, facts]) => ({
    model: modelRef(modelId, locale), harnesses: harnessIdsOf(benchmarkId, modelId).map(harnessId => harnessRef(harnessId, locale)), result: resultCountsOf(facts),
  })).sort((a, b) => (b.result.passRate ?? -1) - (a.result.passRate ?? -1));
}

export function modelDetailOf(benchmarkId: string, modelId: string, locale: Locale): ConsoleModelDetail {
  const facts = runFactsOf(benchmarkId).filter(fact => fact.key.modelId === modelId);
  return {
    model: modelRef(modelId, locale), benchmark: benchmarkRef(benchmarkId), result: resultCountsOf(facts),
    byHarness: harnessIdsOf(benchmarkId, modelId)
      .map(harnessId => ({ harness: harnessRef(harnessId, locale), result: resultCountsOf(facts.filter(fact => fact.key.harnessId === harnessId)) }))
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
  const facts = runFactsOf(benchmarkId).filter(fact => fact.key.modelId === modelId && (!filter.harness || fact.key.harnessId === filter.harness));
  const rows = [...Map.groupBy(facts, fact => fact.task.id).values()].map((runs: RunFact[]): ModelTaskRow => {
    const result = resultCountsOf(runs);
    const spread = spreadOf(result);
    return {
      task: { id: runs[0].task.id, title: runs[0].task.title }, result, ...(spread && { spread }),
      runs: runs.map(fact => ({ id: fact.runId, harness: harnessRef(fact.key.harnessId, locale), attempt: fact.key.attempt, outcome: fact.outcome, ...(fact.failureClass && { failureClass: fact.failureClass }) })),
    };
  });
  const matching = rows.filter(row => matchesTaskSearch(row.task, filter.q) && (!filter.spread || row.spread === filter.spread));
  const listed = new Set(matching.map(row => row.task.id));
  return {
    rows: sortedTasks(matching, filter.order, row => row.task.id, row => row.result.passRate),
    totals: resultCountsOf(facts.filter(fact => listed.has(fact.task.id))),
  };
}
