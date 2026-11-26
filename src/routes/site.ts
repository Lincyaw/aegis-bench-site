import type { LeaderboardView } from '../api/types';
import { leaderboardViewValues } from '../api/schema';
import { pathWithSearch, searchOf, type AddressTable } from './address';

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
  view: LeaderboardView;
  model?: string;
}

/** Every parameter the leaderboard keeps in its address, with the value the address leaves unsaid. */
export const LEADERBOARD_PARAMS: AddressTable<LeaderboardQuery> = { bench: undefined, view: 'combination', model: undefined };

/** The leaderboard, opened on one benchmark and marking one model's rows when given. */
export function leaderboardPath(query: Partial<LeaderboardQuery> = {}): string {
  return pathWithSearch(LEADERBOARD_PATH, searchOf(LEADERBOARD_PARAMS, query));
}

/** The view a leaderboard address names; an address naming no view shows the combinations. */
export function parseLeaderboardView(value: string | null): LeaderboardView {
  const view = value ?? LEADERBOARD_PARAMS.view;
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

/** What a task's files page keeps in its address: the open file. */
export interface TaskFilesView {
  path: string;
}

/** The task's files page opens on the task text unless its address names another file. */
export const TASK_FILES_PARAMS: AddressTable<TaskFilesView> = { path: INSTRUCTION_PATH };

export function parseTaskFilesView(params: URLSearchParams): TaskFilesView {
  return { path: params.get('path') ?? TASK_FILES_PARAMS.path };
}

/** Entries a directory shows at first and adds each time the reader asks for more. */
export const ENTRY_PAGE_SIZE = 50;

/** A task's files, opened on one file when given. */
export function taskFilesPath(benchmarkId: string, taskId: string, file?: string): string {
  return pathWithSearch(`${BENCHMARKS_PATH}/${benchmarkId}/tasks/${taskId}`, searchOf(TASK_FILES_PARAMS, { path: file }));
}
