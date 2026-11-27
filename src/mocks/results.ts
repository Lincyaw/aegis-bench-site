import { combinationKey } from '../api/constraints';
import { consolePendingKindValues } from '../api/schema';
import type { BenchmarkOverview, CombinationScope, ConsoleBenchmark, EntrantKey, EntrantResult, LeaderboardEntry, Locale, PendingKind, PendingWork, ResultCounts, RunFact, RunOutcome } from '../api/types';
import { benchmarkOf, benchmarkRef } from './benchmarks';
import { harnessRef, isSameCombination, keepsTo, modelRef, stageRef } from './catalog';
import { runRowOf } from './consoleRuns';

/** Failed runs the overview lists, newest first. */
export const RECENT_FAILURE_COUNT = 5;

/** Whether a run counts as a model result: an execution failure does not. */
export function isCounted(run: { outcome: RunOutcome }): boolean {
  return run.outcome !== 'executionFailed';
}

/** Share of passed runs among the counted ones; absent when no run counts, as the spec declares. */
export function passRateOf(runs: readonly { outcome: RunOutcome }[]): number | undefined {
  const counted = runs.filter(isCounted);
  return counted.length === 0 ? undefined : counted.filter(run => run.outcome === 'passed').length / counted.length;
}

/** Orders results best pass rate first; a result with no counted run comes last. */
export function byPassRate(a: { passRate?: number }, b: { passRate?: number }): number {
  return (b.passRate ?? -1) - (a.passRate ?? -1);
}

/** What a set of runs comes to; rates and means are over the counted runs, which leave out execution failures. */
export function resultCountsOf(facts: readonly RunFact[]): ResultCounts {
  const counted = facts.filter(isCounted);
  const passed = counted.filter(fact => fact.outcome === 'passed');
  const failed = counted.filter(fact => fact.outcome === 'failed');
  const tasks = [...Map.groupBy(counted, fact => fact.taskId).values()];
  const mean = (value: (fact: RunFact) => number) => counted.reduce((sum, fact) => sum + value(fact), 0) / counted.length;
  return {
    runs: facts.length, passed: passed.length, failed: failed.length, executionFailed: facts.length - counted.length,
    tasks: tasks.length,
    solvedEveryTime: tasks.filter(runs => runs.every(fact => fact.outcome === 'passed')).length,
    solvedOnce: tasks.filter(runs => runs.some(fact => fact.outcome === 'passed')).length,
    ...(counted.length > 0 && { passRate: passRateOf(facts), meanCostUsd: mean(fact => fact.costUsd), meanSteps: mean(fact => fact.steps) }),
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
  const counted = runs.filter(isCounted);
  const better = record.metric.higherIsBetter ? -1 : 1;
  const ranking = [...Map.groupBy(counted, fact => combinationKey(fact.modelId, fact.harnessId)).values()]
    .map(facts => ({
      modelId: facts[0].modelId, harnessId: facts[0].harnessId,
      score: facts.reduce((sum, fact) => sum + fact.score, 0) / facts.length,
      avgCostUsd: facts.reduce((sum, fact) => sum + fact.costUsd, 0) / facts.length,
    }))
    .sort((a, b) => better * (a.score - b.score) || a.modelId.localeCompare(b.modelId) || a.harnessId.localeCompare(b.harnessId));
  rankingCache.set(benchmarkId, ranking);
  return ranking;
}

/** The ranked combinations a scope keeps to, best first; none when the scope names a model or harness the benchmark lacks. */
export function rankingIn(benchmarkId: string, scope: CombinationScope): RankedEntrant[] {
  return rankingOf(benchmarkId).filter(ranked => keepsTo(scope, ranked.modelId, ranked.harnessId));
}

/** What a 404 says of a scope that keeps to none of a benchmark's combinations. */
export function unknownScopeMessage(benchmarkId: string, scope: CombinationScope): string {
  return `no combination of ${scope.model || 'any model'} in ${scope.harness || 'any harness'} on ${benchmarkId}`;
}

/** The given combinations ranked by their results on the benchmark, best first. */
export function leaderboardOf(benchmarkId: string, entrants: EntrantKey[], locale: Locale): LeaderboardEntry[] {
  const { record } = benchmarkOf(benchmarkId);
  return rankingOf(benchmarkId)
    .filter(ranked => entrants.some(entrant => isSameCombination(entrant, ranked)))
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
  const byEntrant = Map.groupBy(benchmarkOf(benchmarkId).runs, fact => combinationKey(fact.modelId, fact.harnessId));
  return [...byEntrant.values()]
    .map(facts => ({ model: modelRef(facts[0].modelId, locale), harness: harnessRef(facts[0].harnessId, locale), result: resultCountsOf(facts) }))
    .sort((a, b) => byPassRate(a.result, b.result));
}

/** A kind of waiting work: how many runs wait on it and the run list's filters that list them. */
export function pendingWorkOf(kind: PendingKind, totals: ResultCounts): PendingWork {
  switch (kind) {
    case 'unreviewedFailures': return { kind, count: totals.unreviewed, review: 'unreviewed' };
    case 'executionFailures': return { kind, count: totals.executionFailed, outcome: 'executionFailed' };
    case 'gradingErrors': return { kind, count: totals.gradingErrors, review: 'gradingError' };
  }
}

export function overviewOf(benchmarkId: string, locale: Locale): BenchmarkOverview {
  const facts = benchmarkOf(benchmarkId).runs;
  const totals = resultCountsOf(facts);
  const recentFailures = facts.filter(fact => fact.outcome === 'failed')
    .toSorted((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, RECENT_FAILURE_COUNT)
    .map(fact => runRowOf(benchmarkId, fact, locale));
  return {
    benchmark: consoleBenchmarkOf(benchmarkId, locale), totals, entrants: entrantResultsOf(benchmarkId, locale), recentFailures,
    pending: consolePendingKindValues.map(kind => pendingWorkOf(kind, totals)).filter(work => work.count > 0),
  };
}
