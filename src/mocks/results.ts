import type { BenchmarkOverview, ConsoleBenchmark, EntrantResult, Locale, PendingWork, ResultCounts } from '../api/types';
import { benchmarkById, benchmarkRef } from './benchmarks';
import { RUNS_PER_TASK, harnessRef, modelRef, stageRef } from './catalog';
import { runFactsOf, runRowOf, type RunFact } from './runIndex';

/** Failed runs the overview lists, newest first. */
export const RECENT_FAILURE_COUNT = 5;

/** What a set of runs comes to; rates and means are over the counted runs, which leave out execution failures. */
export function resultCountsOf(facts: readonly RunFact[]): ResultCounts {
  const counted = facts.filter(fact => fact.outcome !== 'executionFailed');
  const passed = counted.filter(fact => fact.outcome === 'passed');
  const failed = counted.filter(fact => fact.outcome === 'failed');
  const byTask = Map.groupBy(counted, fact => fact.task.id);
  const tasks = [...byTask.values()];
  const mean = (value: (fact: RunFact) => number) => counted.reduce((sum, fact) => sum + value(fact), 0) / counted.length;
  return {
    runs: facts.length, passed: passed.length, failed: failed.length, executionFailed: facts.length - counted.length,
    tasks: tasks.length,
    solvedEveryTime: tasks.filter(runs => runs.every(fact => fact.outcome === 'passed')).length,
    solvedOnce: tasks.filter(runs => runs.some(fact => fact.outcome === 'passed')).length,
    ...(counted.length > 0 && { passRate: passed.length / counted.length, meanCostUsd: mean(fact => fact.costUsd), meanSteps: mean(fact => fact.steps) }),
    modelErrors: failed.filter(fact => fact.failureClass === 'modelError').length,
    gradingErrors: failed.filter(fact => fact.failureClass === 'gradingError').length,
    constructionProblems: failed.filter(fact => fact.failureClass === 'constructionProblem').length,
    unreviewed: failed.filter(fact => fact.failureClass === undefined).length,
  };
}

export function consoleBenchmarkOf(benchmarkId: string, locale: Locale): ConsoleBenchmark {
  const record = benchmarkById(benchmarkId);
  const { action, change, submitPassed, submitFailed } = record.timelineLegend;
  return {
    ...benchmarkRef(benchmarkId), stage: stageRef(record.stageId, locale), version: record.version, summary: record.summary[locale],
    metric: { ...record.metric, name: record.metric.name[locale] }, taskCount: record.taskCount,
    entrants: record.ranking.map(([modelId, harnessId]) => ({ model: modelRef(modelId, locale), harness: harnessRef(harnessId, locale) })),
    runCount: record.taskCount * record.ranking.length * RUNS_PER_TASK,
    timelineLegend: { action: action[locale], change: change[locale], submitPassed: submitPassed[locale], submitFailed: submitFailed[locale] },
  };
}

/** Every combination's result, best pass rate first. */
export function entrantResultsOf(benchmarkId: string, locale: Locale): EntrantResult[] {
  const byEntrant = Map.groupBy(runFactsOf(benchmarkId), fact => `${fact.key.modelId}-${fact.key.harnessId}`);
  return [...byEntrant.values()]
    .map(facts => ({ model: modelRef(facts[0].key.modelId, locale), harness: harnessRef(facts[0].key.harnessId, locale), result: resultCountsOf(facts) }))
    .sort((a, b) => (b.result.passRate ?? 0) - (a.result.passRate ?? 0));
}

export function overviewOf(benchmarkId: string, locale: Locale): BenchmarkOverview {
  const facts = runFactsOf(benchmarkId);
  const totals = resultCountsOf(facts);
  const recentFailures = facts.filter(fact => fact.outcome === 'failed')
    .toSorted((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, RECENT_FAILURE_COUNT)
    .map(fact => runRowOf(fact, locale));
  const pending: PendingWork[] = [
    { kind: 'unreviewedFailures', count: totals.unreviewed },
    { kind: 'executionFailures', count: totals.executionFailed },
    { kind: 'gradingErrors', count: totals.gradingErrors },
  ];
  return {
    benchmark: consoleBenchmarkOf(benchmarkId, locale), totals, entrants: entrantResultsOf(benchmarkId, locale), recentFailures,
    pending: pending.filter(work => work.count > 0),
  };
}
