import openapi from '../api/openapi.json';
import type { NavIcon } from './ConsoleIcons';

/** The form an account name takes, as the spec declares it; the sign-in form checks it before asking the API. */
export const ACCOUNT_PATTERN = openapi.components.schemas['Console.AccountName'].pattern;

/** Every path of the console, as site paths; links add the reader's locale. */
export const CONSOLE_PATH = '/console';
export const SIGN_IN_PATH = `${CONSOLE_PATH}/sign-in`;

/** The demo's mock server lets any account in with this password, and the sign-in page says so. */
export const DEMO_PASSWORD = 'aegis';

/** The sign-in page's parameter naming the console page to return to. */
export const NEXT_PARAM = 'next';

export function signInPath(next: string): string {
  return `${SIGN_IN_PATH}?${new URLSearchParams({ [NEXT_PARAM]: next })}`;
}

/** The page the sign-in page returns to: a console page, the console's home when the address names none. */
export function nextPathOf(search: URLSearchParams): string {
  const next = search.get(NEXT_PARAM) ?? CONSOLE_PATH;
  if (next !== CONSOLE_PATH && !next.startsWith(`${CONSOLE_PATH}/`)) {
    throw new Error(`the sign-in page returns only to console pages, not to ${next}`);
  }
  return next;
}

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

/** A benchmark's sections in the sidebar, in order; labels are message keys. */
export const BENCHMARK_SECTIONS: { section: string; label: 'console.nav.overview'; icon: NavIcon }[] = [
  { section: '', label: 'console.nav.overview', icon: 'overview' },
];
