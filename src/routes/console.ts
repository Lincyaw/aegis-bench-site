import { generatePath, matchPath } from 'react-router-dom';
import type { CombinationScope } from '../api/types';
import { pathWithSearch } from './address';

/** Every path of the console, as site paths; links add the reader's locale. */
export const CONSOLE_PATH = '/console';
export const SIGN_IN_PATH = `${CONSOLE_PATH}/sign-in`;

/** The sign-in page's parameter naming the console page to return to. */
export const NEXT_PARAM = 'next';

export function signInPath(next: string): string {
  return pathWithSearch(SIGN_IN_PATH, new URLSearchParams({ [NEXT_PARAM]: next }));
}

/**
 * The combinations a console page keeps to, from its address, where every page names them the same way: a model, and
 * within it a harness. A harness without its model fails the page rather than showing something else.
 */
export function parseCombinationScope(params: URLSearchParams): CombinationScope {
  const model = params.get('model') ?? undefined;
  const harness = params.get('harness') ?? undefined;
  if (harness !== undefined && model === undefined) {
    throw new Error(`a page keeps to a harness only within a model, not to ${harness} alone`);
  }
  return { model, harness };
}

/** The page the sign-in page returns to: a console page, the console's home when the address names none. */
export function nextPathOf(search: URLSearchParams): string {
  const next = search.get(NEXT_PARAM) ?? CONSOLE_PATH;
  if (next !== CONSOLE_PATH && !next.startsWith(`${CONSOLE_PATH}/`)) {
    throw new Error(`the sign-in page returns only to console pages, not to ${next}`);
  }
  return next;
}

export const RELEASE_LOG_PATH = `${CONSOLE_PATH}/releases`;
export const CHANGELOG_PATH = `${CONSOLE_PATH}/changelog`;
export const MEMBERS_PATH = `${CONSOLE_PATH}/members`;
export const SETTINGS_PATH = `${CONSOLE_PATH}/settings`;

/** The sections of a benchmark in the console, each with the path segment that follows the benchmark's own; the overview is the benchmark's own page. */
export const BENCHMARK_SEGMENTS = {
  overview: '', tasks: 'tasks', runs: 'runs', models: 'models', analysis: 'analysis', collections: 'collections', reports: 'reports', releases: 'releases',
} as const;
export type BenchmarkSectionId = keyof typeof BENCHMARK_SEGMENTS;

/** The patterns the router matches in the console, each the path its builders write with the ids named. */
const CONSOLE_BENCHMARK_ROUTE = `${CONSOLE_PATH}/benchmarks/:benchmarkId`;
export const CONSOLE_ROUTES = {
  workbench: CONSOLE_PATH,
  releaseLog: RELEASE_LOG_PATH,
  changelog: CHANGELOG_PATH,
  members: MEMBERS_PATH,
  settings: SETTINGS_PATH,
  benchmark: CONSOLE_BENCHMARK_ROUTE,
  tasks: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.tasks}`,
  task: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.tasks}/:taskId`,
  runs: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.runs}`,
  run: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.runs}/:runId`,
  models: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.models}`,
  model: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.models}/:modelId`,
  analysis: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.analysis}`,
  hunt: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.analysis}/:huntId`,
  collections: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.collections}`,
  collection: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.collections}/:tag`,
  reports: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.reports}`,
  report: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.reports}/:reportId`,
  releases: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.releases}`,
  release: `${CONSOLE_BENCHMARK_ROUTE}/${BENCHMARK_SEGMENTS.releases}/:releaseId`,
} as const;

export function consoleBenchmarkPath(benchmarkId: string): string {
  return generatePath(CONSOLE_BENCHMARK_ROUTE, { benchmarkId });
}

/** A section of a benchmark in the console. */
export function benchmarkSectionPath(benchmarkId: string, section: BenchmarkSectionId): string {
  const segment = BENCHMARK_SEGMENTS[section];
  return segment ? `${consoleBenchmarkPath(benchmarkId)}/${segment}` : consoleBenchmarkPath(benchmarkId);
}

/** The section of a benchmark a console site path is in, so another benchmark can open the same section; outside a benchmark, none. */
export function benchmarkSectionOf(path: string): BenchmarkSectionId | undefined {
  const match = matchPath({ path: `${CONSOLE_BENCHMARK_ROUTE}/:segment?`, end: false }, path);
  return match ? (Object.keys(BENCHMARK_SEGMENTS) as BenchmarkSectionId[]).find(section => BENCHMARK_SEGMENTS[section] === (match.params.segment ?? '')) : undefined;
}
