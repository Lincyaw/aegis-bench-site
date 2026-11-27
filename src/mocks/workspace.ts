import type { ChangelogEntry, Locale, ReleaseOverview, RevisionChange, Workbench } from '../api/types';
import { benchmarkOf, benchmarkRef } from './benchmarks';
import { revisionsOf } from './consoleTasks';
import { openedIndexes } from './records';
import { consoleBenchmarkOf, pendingWorkOf, resultCountsOf } from './results';
import { currentReleaseOf, draftOf, releaseSummaryOf, releasesOf } from './releases';

/* The console's workspace: every benchmark at a glance, every release, and every task's versions. */

/** Publications the overview and the workbench list, newest first. */
export const RECENT_RELEASE_COUNT = 6;

export function recentReleases() {
  return openedIndexes().catalog.benchmarks.flatMap(benchmarkId => releasesOf(benchmarkId)).filter(release => release.status !== 'draft')
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, RECENT_RELEASE_COUNT).map(releaseSummaryOf);
}

export function releaseOverview(): ReleaseOverview {
  return {
    benchmarks: openedIndexes().catalog.benchmarks.map(benchmarkId => {
      const draft = draftOf(benchmarkId);
      return { benchmark: benchmarkRef(benchmarkId), current: releaseSummaryOf(currentReleaseOf(benchmarkId)), ...(draft && { draft: releaseSummaryOf(draft) }) };
    }),
    recent: recentReleases(),
  };
}

export function workbenchOf(locale: Locale): Workbench {
  const benchmarks = openedIndexes().catalog.benchmarks.map(benchmarkId => {
    const totals = resultCountsOf(benchmarkOf(benchmarkId).runs);
    const draft = draftOf(benchmarkId);
    return {
      benchmark: consoleBenchmarkOf(benchmarkId, locale), unreviewedFailures: pendingWorkOf('unreviewedFailures', totals),
      executionFailures: pendingWorkOf('executionFailures', totals), current: releaseSummaryOf(currentReleaseOf(benchmarkId)), ...(draft && { draft: releaseSummaryOf(draft) }),
    };
  });
  return {
    benchmarks,
    totals: {
      drafts: benchmarks.filter(row => row.draft).length,
      unreviewedFailures: benchmarks.reduce((sum, row) => sum + row.unreviewedFailures.count, 0),
      executionFailures: benchmarks.reduce((sum, row) => sum + row.executionFailures.count, 0),
    },
    recentReleases: recentReleases(),
  };
}

/** Every version of every task of the benchmarks asked for, newest first. */
export function changelogOf(benchmarkIds: string[], change: RevisionChange | undefined): ChangelogEntry[] {
  return benchmarkIds
    .flatMap(benchmarkId => benchmarkOf(benchmarkId).tasks.flatMap(task => revisionsOf(benchmarkId, task).map(revision => ({
      benchmark: benchmarkRef(benchmarkId), task: { id: task.id, title: task.title }, revision,
    }))))
    .filter(entry => !change || entry.revision.change === change)
    .sort((a, b) => b.revision.registeredAt.localeCompare(a.revision.registeredAt));
}
