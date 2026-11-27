import { generatePath } from 'react-router-dom';
import type { LeaderboardView } from '../api/types';
import { leaderboardViewValues } from '../api/schema';
import { parseChoice, pathWithSearch, searchOf, type AddressTable } from './address';

export const BENCHMARKS_PATH = '/benchmarks';
export const LEADERBOARD_PATH = '/leaderboard';
export const MODELS_PATH = '/models';
export const REPORTS_PATH = '/reports';
export const ABOUT_PATH = '/about';
export const METHODOLOGY_PATH = '/methodology';
export const SITE_CHANGELOG_PATH = '/changelog';

export const CONTACT_ANCHOR = 'contact';
export const CONTACT_PATH = `${ABOUT_PATH}#${CONTACT_ANCHOR}`;

/** The patterns the router matches on the site, each the path its builders write with the ids named. */
const BENCHMARK_ROUTE = `${BENCHMARKS_PATH}/:benchmarkId`;
export const SITE_ROUTES = {
  benchmarks: BENCHMARKS_PATH,
  benchmark: BENCHMARK_ROUTE,
  runRecords: `${BENCHMARK_ROUTE}/runs`,
  taskFiles: `${BENCHMARK_ROUTE}/tasks/:taskId`,
  leaderboard: LEADERBOARD_PATH,
  model: `${MODELS_PATH}/:modelId`,
  reports: REPORTS_PATH,
  report: `${REPORTS_PATH}/:slug`,
} as const;

export function benchmarkPath(benchmarkId: string): string {
  return generatePath(SITE_ROUTES.benchmark, { benchmarkId });
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

/** The leaderboard's state from its address; an address naming no view shows the combinations, and a view outside its set fails the page. */
export function parseLeaderboardQuery(params: URLSearchParams): LeaderboardQuery {
  return { bench: params.get('bench') ?? undefined, view: parseChoice(params, 'view', leaderboardViewValues) ?? LEADERBOARD_PARAMS.view, model: params.get('model') ?? undefined };
}

/** Entries the leaderboard shows at first and adds each time the reader asks for more. */
export const LEADERBOARD_PAGE_SIZE = 20;

export function modelPath(modelId: string): string {
  return generatePath(SITE_ROUTES.model, { modelId });
}

export function reportPath(slug: string): string {
  return generatePath(SITE_ROUTES.report, { slug });
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
  return pathWithSearch(generatePath(SITE_ROUTES.taskFiles, { benchmarkId, taskId }), searchOf(TASK_FILES_PARAMS, { path: file }));
}
