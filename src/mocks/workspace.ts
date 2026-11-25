import type { ChangelogEntry, Locale, ReleaseOverview, RevisionChange, Workbench } from '../api/types';
import { BENCHMARKS, benchmarkRef } from './benchmarks';
import { revisionsOf } from './consoleTasks';
import { consoleBenchmarkOf, resultCountsOf } from './results';
import { currentReleaseOf, draftOf, releaseSummaryOf, releasesOf } from './releases';
import { runFactsOf } from './runIndex';
import { tasksOf } from './tasks';

/* The console's workspace: every benchmark at a glance, every release, and every task's versions. */

/** Publications the overview and the workbench list, newest first. */
export const RECENT_RELEASE_COUNT = 6;

/** Task versions per page of the changelog when a request names no limit, as the spec declares. */
export const DEFAULT_CHANGELOG_PAGE_SIZE = 25;

export function recentReleases() {
  return BENCHMARKS.flatMap(benchmark => releasesOf(benchmark.id)).filter(release => release.status !== 'draft')
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, RECENT_RELEASE_COUNT).map(releaseSummaryOf);
}

export function releaseOverview(): ReleaseOverview {
  return {
    benchmarks: BENCHMARKS.map(benchmark => {
      const draft = draftOf(benchmark.id);
      return { benchmark: benchmarkRef(benchmark.id), current: releaseSummaryOf(currentReleaseOf(benchmark.id)), ...(draft && { draft: releaseSummaryOf(draft) }) };
    }),
    recent: recentReleases(),
  };
}

export function workbenchOf(locale: Locale): Workbench {
  return {
    benchmarks: BENCHMARKS.map(benchmark => {
      const totals = resultCountsOf(runFactsOf(benchmark.id));
      const draft = draftOf(benchmark.id);
      return {
        benchmark: consoleBenchmarkOf(benchmark.id, locale), unreviewedFailures: totals.unreviewed, executionFailures: totals.executionFailed,
        current: releaseSummaryOf(currentReleaseOf(benchmark.id)), ...(draft && { draft: releaseSummaryOf(draft) }),
      };
    }),
    recentReleases: recentReleases(),
  };
}

/** Every version of every task of the benchmarks asked for, newest first. */
export function changelogOf(benchmarkIds: string[], change: RevisionChange | undefined): ChangelogEntry[] {
  return benchmarkIds
    .flatMap(benchmarkId => tasksOf(benchmarkId).flatMap(task => revisionsOf(benchmarkId, task).map(revision => ({
      benchmark: benchmarkRef(benchmarkId), task: { id: task.id, title: task.title }, revision,
    }))))
    .filter(entry => !change || entry.revision.change === change)
    .sort((a, b) => b.revision.registeredAt.localeCompare(a.revision.registeredAt));
}
