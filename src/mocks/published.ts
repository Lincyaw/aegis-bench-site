import { combinationKey } from '../api/constraints';
import type { Combination, CombinationRuns, EntrantKey, LeaderboardEntry, Locale, PublicTaskComparison, RecentRun, RunRef, TaskRecord, TaskSummary } from '../api/types';
import { benchmarkOf, type BenchmarkShowing } from './benchmarks';
import { taskComparisonOf } from './comparison';
import { openedIndexes } from './records';
import { currentReleaseOf } from './releases';
import { leaderboardOf } from './results';
import { recentRunsOf } from './runs';
import { taskRunRefsOf, taskSummaryOf } from './tasks';

/*
 * What the public site shows of each benchmark: what its current release publishes. The console's releases change it;
 * every public operation reads it through here.
 */

/** The combinations the current release publishes, ranked by their results. */
export function publishedEntriesOf(benchmarkId: string, locale: Locale): LeaderboardEntry[] {
  return leaderboardOf(benchmarkId, currentReleaseOf(benchmarkId).content.entrants, locale);
}

export function publishedShowingOf(benchmarkId: string, locale: Locale): BenchmarkShowing {
  return { summary: currentReleaseOf(benchmarkId).content.summary[locale], entries: publishedEntriesOf(benchmarkId, locale) };
}

export function publishedRecentRunsOf(benchmarkId: string, locale: Locale): Promise<RecentRun[]> {
  return recentRunsOf(currentReleaseOf(benchmarkId).content.replays, locale);
}

/** The entrant of the current release that a "<model id>-<harness id>" key names, or nothing when the release publishes none by it. */
export function publishedEntrantOf(benchmarkId: string, key: string): EntrantKey | undefined {
  return currentReleaseOf(benchmarkId).content.entrants.find(entrant => combinationKey(entrant.modelId, entrant.harnessId) === key);
}

/** Whether the current release publishes a model and harness pair. */
export function publishes(benchmarkId: string, { model, harness }: Combination): boolean {
  return publishedEntrantOf(benchmarkId, combinationKey(model.id, harness.id)) !== undefined;
}

/** Whether a run is one of a combination the current release publishes; a run that does not exist is not. */
export function publishesRun(runId: string): boolean {
  const located = openedIndexes().runs.get(runId);
  return located !== undefined && publishedEntrantOf(located.benchmarkId, combinationKey(located.fact.modelId, located.fact.harnessId)) !== undefined;
}

/** A task's runs by combination, keeping only the combinations the current release publishes. */
export function publishedTaskRuns(benchmarkId: string, combinations: CombinationRuns[]): CombinationRuns[] {
  return combinations.filter(combination => publishes(benchmarkId, combination));
}

/** The runs of a task by the combinations the current release publishes. */
export function publishedRunRefsOf(benchmarkId: string, taskId: string): RunRef[] {
  return taskRunRefsOf(benchmarkId, taskId)
    .filter(combination => publishedEntrantOf(benchmarkId, combinationKey(combination.modelId, combination.harnessId)) !== undefined)
    .flatMap(combination => combination.runs);
}

/** Every task of the benchmark, each with its pass rate over the runs of the combinations the current release publishes. */
export function publishedTaskSummariesOf(benchmarkId: string): TaskSummary[] {
  return benchmarkOf(benchmarkId).tasks.map(task => taskSummaryOf(benchmarkId, task, publishedRunRefsOf(benchmarkId, task.id)));
}

/** A comparison of runs the current release publishes, without the class each failure's review gives it; none when a run is not published. */
export async function publishedTaskComparisonOf(benchmarkId: string, task: TaskRecord, runIds: string[], locale: Locale): Promise<PublicTaskComparison | undefined> {
  const comparison = await taskComparisonOf(benchmarkId, task, runIds, locale);
  return comparison?.runs.every(run => publishes(benchmarkId, run))
    ? { ...comparison, runs: comparison.runs.map(({ failureClass: _withheld, ...run }) => run) }
    : undefined;
}
