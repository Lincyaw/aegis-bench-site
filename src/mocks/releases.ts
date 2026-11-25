import type { ReleaseChanges, ReleaseContent, ReleaseDetail, ReleaseStatus, ReleaseSummary } from '../api/types';
import { BENCHMARKS, benchmarkById, benchmarkRef } from './benchmarks';
import { parseRunId, runIdOf } from './runs';

/*
 * The releases of each benchmark. Unlike the rest of the demo's data they change: the console drafts, publishes,
 * restores and discards them, and the public site shows the current one. They are kept in memory, so a reload brings
 * back the two releases each benchmark starts with.
 */

export interface ReleaseRecord {
  id: string;
  benchmarkId: string;
  version: number;
  status: ReleaseStatus;
  note?: string;
  author: string;
  updatedAt: string;
  restoresVersion?: number;
  content: ReleaseContent;

  /** What the public site showed when the release was drafted or when it was published, which its changes are counted against */
  baseline: ReleaseContent;
}

export function releaseIdOf(benchmarkId: string, version: number): string {
  return `${benchmarkId}.${version}`;
}

/** Each benchmark's first two releases: the second added the last two combinations and a third example run. */
export function initialReleasesOf(benchmarkId: string): ReleaseRecord[] {
  const record = benchmarkById(benchmarkId);
  const entrants = record.ranking.map(([modelId, harnessId]) => ({ modelId, harnessId }));
  const replays = record.listedRuns.map(([taskId, modelId, harnessId]) => runIdOf(benchmarkId, taskId, modelId, harnessId, 1));
  const first: ReleaseContent = { summary: { ...record.summary }, entrants: entrants.slice(0, -2), replays: replays.slice(0, 2) };
  const second: ReleaseContent = { summary: { ...record.summary }, entrants, replays };
  return [
    {
      id: releaseIdOf(benchmarkId, 2), benchmarkId, version: 2, status: 'current', note: '加入两个组合，并增加一个运行示例。', author: 'lin.fang',
      updatedAt: `${record.updatedOn}T08:00:00Z`, content: second, baseline: first,
    },
    {
      id: releaseIdOf(benchmarkId, 1), benchmarkId, version: 1, status: 'superseded', note: '首次发布。', author: 'zhou.yu',
      updatedAt: '2026-09-15T08:00:00Z', content: first, baseline: { summary: first.summary, entrants: [], replays: [] },
    },
  ];
}

const store = new Map<string, ReleaseRecord[]>();

/** The list a benchmark's releases are kept in, which drafting, publishing and discarding change. */
export function storedReleasesOf(benchmarkId: string): ReleaseRecord[] {
  const releases = store.get(benchmarkId) ?? initialReleasesOf(benchmarkId);
  store.set(benchmarkId, releases);
  return releases;
}

/** A benchmark's releases: its draft first, if any, then every version it published, newest first. */
export function releasesOf(benchmarkId: string): ReleaseRecord[] {
  return storedReleasesOf(benchmarkId).toSorted((a, b) => b.version - a.version);
}

export function currentReleaseOf(benchmarkId: string): ReleaseRecord {
  const current = releasesOf(benchmarkId).find(release => release.status === 'current');
  if (!current) {
    throw new Error(`${benchmarkId} has no current release`);
  }
  return current;
}

export function draftOf(benchmarkId: string): ReleaseRecord | undefined {
  return releasesOf(benchmarkId).find(release => release.status === 'draft');
}

export function releaseById(releaseId: string): ReleaseRecord | undefined {
  return BENCHMARKS.flatMap(benchmark => releasesOf(benchmark.id)).find(release => release.id === releaseId);
}

export function changesOf(release: ReleaseRecord): ReleaseChanges {
  const { content, baseline } = release;
  const keyOf = (entrant: { modelId: string; harnessId: string }) => `${entrant.modelId}-${entrant.harnessId}`;
  const entrants = new Set(content.entrants.map(keyOf));
  const before = new Set(baseline.entrants.map(keyOf));
  return {
    entrantsAdded: [...entrants].filter(key => !before.has(key)).length,
    entrantsRemoved: [...before].filter(key => !entrants.has(key)).length,
    replaysAdded: content.replays.filter(runId => !baseline.replays.includes(runId)).length,
    replaysRemoved: baseline.replays.filter(runId => !content.replays.includes(runId)).length,
    summaryChanged: content.summary['zh-CN'] !== baseline.summary['zh-CN'] || content.summary.en !== baseline.summary.en,
  };
}

export function releaseSummaryOf(release: ReleaseRecord): ReleaseSummary {
  return {
    id: release.id, benchmark: benchmarkRef(release.benchmarkId), version: release.version, status: release.status,
    ...(release.note && { note: release.note }), author: release.author, updatedAt: release.updatedAt,
    ...(release.restoresVersion && { restoresVersion: release.restoresVersion }), changes: changesOf(release),
  };
}

export function releaseDetailOf(release: ReleaseRecord): ReleaseDetail {
  return { ...releaseSummaryOf(release), content: release.content };
}

/** Why a content cannot be published for a benchmark, or nothing when it can. */
export function contentProblemOf(benchmarkId: string, content: ReleaseContent): string | undefined {
  const { ranking } = benchmarkById(benchmarkId);
  const unranked = content.entrants.find(entrant => !ranking.some(([modelId, harnessId]) => modelId === entrant.modelId && harnessId === entrant.harnessId));
  const foreign = content.replays.find(runId => parseRunId(runId)?.benchmarkId !== benchmarkId);
  return unranked ? `${benchmarkId} did not rank ${unranked.modelId} in ${unranked.harnessId}`
    : foreign ? `${foreign} is not a run of ${benchmarkId}` : undefined;
}

/** The number a benchmark's next release takes. */
export function nextVersionOf(benchmarkId: string): number {
  return Math.max(...storedReleasesOf(benchmarkId).map(release => release.version)) + 1;
}

/** Starts a benchmark's next release as a copy of its current one; the caller has checked it has no draft. */
export function createDraft(benchmarkId: string, author: string): ReleaseRecord {
  const current = currentReleaseOf(benchmarkId);
  const version = nextVersionOf(benchmarkId);
  const draft: ReleaseRecord = {
    id: releaseIdOf(benchmarkId, version), benchmarkId, version, status: 'draft', author,
    updatedAt: new Date().toISOString(), content: structuredClone(current.content), baseline: current.content,
  };
  storedReleasesOf(benchmarkId).push(draft);
  return draft;
}

export function updateDraft(draft: ReleaseRecord, content: ReleaseContent, author: string): ReleaseRecord {
  Object.assign(draft, { content, author, updatedAt: new Date().toISOString() });
  return draft;
}

/** Makes a release the one the public site shows; the release it replaces is superseded and becomes its baseline. */
export function makeCurrent(release: ReleaseRecord, note: string, author: string): ReleaseRecord {
  const replaced = currentReleaseOf(release.benchmarkId);
  replaced.status = 'superseded';
  return Object.assign(release, { status: 'current', note, author, updatedAt: new Date().toISOString(), baseline: replaced.content });
}

/** Publishes a superseded release again, as a new version that restores it. */
export function restoreRelease(release: ReleaseRecord, note: string, author: string): ReleaseRecord {
  const version = nextVersionOf(release.benchmarkId);
  const restored: ReleaseRecord = {
    id: releaseIdOf(release.benchmarkId, version), benchmarkId: release.benchmarkId, version, status: 'draft', author,
    updatedAt: new Date().toISOString(), restoresVersion: release.version, content: structuredClone(release.content), baseline: release.content,
  };
  storedReleasesOf(release.benchmarkId).push(restored);
  return makeCurrent(restored, note, author);
}

export function discardDraft(draft: ReleaseRecord): void {
  store.set(draft.benchmarkId, storedReleasesOf(draft.benchmarkId).filter(release => release !== draft));
}
