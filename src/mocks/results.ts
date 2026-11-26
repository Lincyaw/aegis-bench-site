import type { BenchmarkOverview, ConsoleBenchmark, EntrantKey, EntrantResult, LeaderboardEntry, Locale, PendingWork, ResultCounts, RunFact } from '../api/types';
import { benchmarkOf, benchmarkRef } from './benchmarks';
import { harnessRef, modelRef, stageRef } from './catalog';
import { runRowOf } from './consoleRuns';

/** Failed runs the overview lists, newest first. */
export const RECENT_FAILURE_COUNT = 5;

/** What a set of runs comes to; rates and means are over the counted runs, which leave out execution failures. */
export function resultCountsOf(facts: readonly RunFact[]): ResultCounts {
  const counted = facts.filter(fact => fact.outcome !== 'executionFailed');
  const passed = counted.filter(fact => fact.outcome === 'passed');
  const failed = counted.filter(fact => fact.outcome === 'failed');
  const tasks = [...Map.groupBy(counted, fact => fact.taskId).values()];
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

/** A combination's result in the benchmark's metric and its average cost, both over its counted runs. */
export interface RankedEntrant extends EntrantKey {
  score: number;
  avgCostUsd: number;
}

const rankingCache = new Map<string, RankedEntrant[]>();

/** Every combination that ran on the benchmark, best result first. */
export function rankingOf(benchmarkId: string): RankedEntrant[] {
  const cached = rankingCache.get(benchmarkId);
  if (cached) {
    return cached;
  }
  const { record, runs } = benchmarkOf(benchmarkId);
  const counted = runs.filter(fact => fact.outcome !== 'executionFailed');
  const better = record.metric.higherIsBetter ? -1 : 1;
  const ranking = [...Map.groupBy(counted, fact => `${fact.modelId}-${fact.harnessId}`).values()]
    .map(facts => ({
      modelId: facts[0].modelId, harnessId: facts[0].harnessId,
      score: facts.reduce((sum, fact) => sum + fact.score, 0) / facts.length,
      avgCostUsd: facts.reduce((sum, fact) => sum + fact.costUsd, 0) / facts.length,
    }))
    .sort((a, b) => better * (a.score - b.score) || a.modelId.localeCompare(b.modelId) || a.harnessId.localeCompare(b.harnessId));
  rankingCache.set(benchmarkId, ranking);
  return ranking;
}

/** The given combinations ranked by their results on the benchmark, best first. */
export function leaderboardOf(benchmarkId: string, entrants: EntrantKey[], locale: Locale): LeaderboardEntry[] {
  const { record } = benchmarkOf(benchmarkId);
  return rankingOf(benchmarkId)
    .filter(ranked => entrants.some(entrant => entrant.modelId === ranked.modelId && entrant.harnessId === ranked.harnessId))
    .map((ranked, index) => ({
      rank: index + 1, model: modelRef(ranked.modelId, locale), harness: harnessRef(ranked.harnessId, locale), score: ranked.score,
      runsPerTask: record.runsPerTask, avgCostUsd: ranked.avgCostUsd, evaluatedIn: record.evaluatedIn,
    }));
}

export function consoleBenchmarkOf(benchmarkId: string, locale: Locale): ConsoleBenchmark {
  const { record, tasks, runs } = benchmarkOf(benchmarkId);
  const { action, change, submitPassed, submitFailed } = record.timelineLegend;
  return {
    ...benchmarkRef(benchmarkId), stage: stageRef(record.stageId, locale), version: record.version, summary: record.summary[locale],
    metric: { ...record.metric, name: record.metric.name[locale] }, taskCount: tasks.length,
    entrants: rankingOf(benchmarkId).map(ranked => ({ model: modelRef(ranked.modelId, locale), harness: harnessRef(ranked.harnessId, locale) })),
    runCount: runs.length,
    timelineLegend: { action: action[locale], change: change[locale], submitPassed: submitPassed[locale], submitFailed: submitFailed[locale] },
    replayable: record.worldLayers !== undefined,
  };
}

/** Every combination's result, best pass rate first. */
export function entrantResultsOf(benchmarkId: string, locale: Locale): EntrantResult[] {
  const byEntrant = Map.groupBy(benchmarkOf(benchmarkId).runs, fact => `${fact.modelId}-${fact.harnessId}`);
  return [...byEntrant.values()]
    .map(facts => ({ model: modelRef(facts[0].modelId, locale), harness: harnessRef(facts[0].harnessId, locale), result: resultCountsOf(facts) }))
    .sort((a, b) => (b.result.passRate ?? 0) - (a.result.passRate ?? 0));
}

export function overviewOf(benchmarkId: string, locale: Locale): BenchmarkOverview {
  const facts = benchmarkOf(benchmarkId).runs;
  const totals = resultCountsOf(facts);
  const recentFailures = facts.filter(fact => fact.outcome === 'failed')
    .toSorted((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, RECENT_FAILURE_COUNT)
    .map(fact => runRowOf(benchmarkId, fact, locale));
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
