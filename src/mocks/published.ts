import type { CombinationRuns, HarnessRef, LeaderboardEntry, Locale, ModelRef, PublicTaskComparison, RecentRun, TaskRecord } from '../api/types';
import type { BenchmarkShowing } from './benchmarks';
import { taskComparisonOf } from './comparison';
import { currentReleaseOf } from './releases';
import { leaderboardOf } from './results';
import { recentRunsOf } from './runs';

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

/** Whether the current release publishes a model and harness pair. */
export function publishes(benchmarkId: string, { model, harness }: { model: ModelRef; harness: HarnessRef }): boolean {
  return currentReleaseOf(benchmarkId).content.entrants.some(entrant => entrant.modelId === model.id && entrant.harnessId === harness.id);
}

/** A task's runs by combination, keeping only the combinations the current release publishes. */
export function publishedTaskRuns(benchmarkId: string, combinations: CombinationRuns[]): CombinationRuns[] {
  return combinations.filter(combination => publishes(benchmarkId, combination));
}

/** A comparison of runs the current release publishes, without the class each failure's review gives it; none when a run is not published. */
export async function publishedTaskComparisonOf(benchmarkId: string, task: TaskRecord, runIds: string[], locale: Locale): Promise<PublicTaskComparison | undefined> {
  const comparison = await taskComparisonOf(benchmarkId, task, runIds, locale);
  return comparison?.runs.every(run => publishes(benchmarkId, run))
    ? { ...comparison, runs: comparison.runs.map(({ failureClass: _withheld, ...run }) => run) }
    : undefined;
}
