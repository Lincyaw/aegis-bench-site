import type { LeaderboardView } from '../api/types';
import { leaderboardViewValues } from '../api/schema';

export const BENCHMARKS_PATH = '/benchmarks';
export const LEADERBOARD_PATH = '/leaderboard';
export const REPORTS_PATH = '/reports';
export const ABOUT_PATH = '/about';
export const METHODOLOGY_PATH = '/methodology';
export const SITE_CHANGELOG_PATH = '/changelog';

export const CONTACT_ANCHOR = 'contact';
export const CONTACT_PATH = `${ABOUT_PATH}#${CONTACT_ANCHOR}`;

export function benchmarkPath(benchmarkId: string): string {
  return `${BENCHMARKS_PATH}/${benchmarkId}`;
}

/** The anchor of a stage's group on the benchmarks page. */
export function stageAnchor(stageId: string): string {
  return `stage-${stageId}`;
}

export function stagePath(stageId: string): string {
  return `${BENCHMARKS_PATH}#${stageAnchor(stageId)}`;
}

/** What a leaderboard address names: the benchmark it opens on, its view, and the model whose rows it marks. */
export interface LeaderboardQuery {
  bench?: string;
  view?: string;
  model?: string;
}

/** The address search of a leaderboard state; what it leaves unnamed is left out. */
export function leaderboardSearch(query: LeaderboardQuery): URLSearchParams {
  return new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

/** The leaderboard, opened on one benchmark and marking one model's rows when given. */
export function leaderboardPath(query: LeaderboardQuery = {}): string {
  const search = leaderboardSearch(query).toString();
  return search ? `${LEADERBOARD_PATH}?${search}` : LEADERBOARD_PATH;
}

/** The view a leaderboard address names; an address naming no view shows the combinations. */
export function parseLeaderboardView(value: string | null): LeaderboardView {
  const view = value ?? 'combination';
  if (!leaderboardViewValues.includes(view as LeaderboardView)) {
    throw new Error(`no leaderboard view ${view}`);
  }
  return view as LeaderboardView;
}

/** Entries the leaderboard shows at first and adds each time the reader asks for more. */
export const LEADERBOARD_PAGE_SIZE = 20;

export function modelPath(modelId: string): string {
  return `/models/${modelId}`;
}

export function reportPath(slug: string): string {
  return `${REPORTS_PATH}/${slug}`;
}

/** The file a task's page opens on: the task text the model receives. */
export const INSTRUCTION_PATH = 'instruction.md';

/** The search parameter that names the open file. */
export const FILE_PARAM = 'path';

/** Entries a directory shows at first and adds each time the reader asks for more. */
export const ENTRY_PAGE_SIZE = 50;

/** A task's files, opened on one file when given. */
export function taskFilesPath(benchmarkId: string, taskId: string, file?: string): string {
  const path = `${BENCHMARKS_PATH}/${benchmarkId}/tasks/${taskId}`;
  return file ? `${path}?${new URLSearchParams({ [FILE_PARAM]: file }).toString()}` : path;
}
