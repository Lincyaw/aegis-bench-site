import type { CombinationRuns, LeaderboardEntry, Locale, RecentRun } from '../api/types';
import { leaderboardOf, type BenchmarkShowing } from './benchmarks';
import { currentReleaseOf } from './releases';
import { recentRunsOf } from './trajectories';

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

export function publishedRecentRunsOf(benchmarkId: string, locale: Locale): RecentRun[] {
  return recentRunsOf(benchmarkId, currentReleaseOf(benchmarkId).content.replays, locale);
}

/** A task's runs by combination, keeping only the combinations the current release publishes. */
export function publishedTaskRuns(benchmarkId: string, combinations: CombinationRuns[]): CombinationRuns[] {
  const { entrants } = currentReleaseOf(benchmarkId).content;
  return combinations.filter(({ model, harness }) => entrants.some(entrant => entrant.modelId === model.id && entrant.harnessId === harness.id));
}
