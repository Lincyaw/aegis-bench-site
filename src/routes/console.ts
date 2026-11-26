import type { CombinationScope } from '../api/types';
import { pathWithSearch } from './address';

/** Every path of the console, as site paths; links add the reader's locale. */
export const CONSOLE_PATH = '/console';
export const SIGN_IN_PATH = `${CONSOLE_PATH}/sign-in`;

/** The choice of a console filter that keeps everything; no tag, spread, combination, outcome or review is spelt this way. */
export const EVERY_CHOICE = 'all';

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

export function consoleBenchmarkPath(benchmarkId: string): string {
  return `${CONSOLE_PATH}/benchmarks/${benchmarkId}`;
}

/** A section of a benchmark in the console, such as "tasks"; the overview is the empty section. */
export function benchmarkSectionPath(benchmarkId: string, section: string): string {
  return section ? `${consoleBenchmarkPath(benchmarkId)}/${section}` : consoleBenchmarkPath(benchmarkId);
}

/** The section of a benchmark a console site path is in, so another benchmark can open the same section. */
export function benchmarkSectionOf(path: string): string {
  return path.split('/')[4] ?? '';
}
