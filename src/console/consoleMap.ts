import openapi from '../api/openapi.json';
import type { ConsoleBenchmark, Role } from '../api/types';
import type { NavIcon } from './ConsoleIcons';

/** The form an account name takes, as the spec declares it; the sign-in form checks it before asking the API. */
export const ACCOUNT_PATTERN = openapi.components.schemas['Console.AccountName'].pattern;

/** The form an e-mail address takes, as the spec declares it; the settings form checks it before asking the API. */
export const EMAIL_PATTERN = openapi.components.schemas['Console.EmailAddress'].pattern;

const PUBLICATION_RULES = openapi.components.schemas['Console.PublicationRules'].properties;

/** The numbers of reviewers a report may require, as the spec bounds them. */
export const REPORT_REVIEWER_CHOICES = Array.from(
  { length: PUBLICATION_RULES.reportReviewers.maximum - PUBLICATION_RULES.reportReviewers.minimum + 1 },
  (_, index) => PUBLICATION_RULES.reportReviewers.minimum + index,
);

/** The most checks a report may require, as the spec bounds them. */
export const MAX_REPORT_CHECKS = PUBLICATION_RULES.reportChecks.maxItems;

/** Every path of the console, as site paths; links add the reader's locale. */
export const CONSOLE_PATH = '/console';
export const SIGN_IN_PATH = `${CONSOLE_PATH}/sign-in`;

/** The demo's mock server lets every member in with this password, and the sign-in page says so. */
export const DEMO_PASSWORD = 'demo';

/** The choice of a console filter that keeps everything; no tag, spread, combination, outcome or review is spelt this way. */
export const EVERY_CHOICE = 'all';

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

export const RELEASE_LOG_PATH = `${CONSOLE_PATH}/releases`;
export const CHANGELOG_PATH = `${CONSOLE_PATH}/changelog`;
export const MEMBERS_PATH = `${CONSOLE_PATH}/members`;
export const SETTINGS_PATH = `${CONSOLE_PATH}/settings`;

/** The sidebar's choice for the workspace, beside the benchmarks; no benchmark id is spelt this way. */
export const WORKSPACE_CHOICE = 'workspace';

/** A page of the workspace in the sidebar; the label is a message key. */
export interface WorkspaceSection {
  path: string;
  label: 'console.nav.workbench' | 'console.nav.releaseLog' | 'console.nav.changelog' | 'console.nav.members' | 'console.nav.settings';
  icon: NavIcon;
}

/** The workspace's pages in the sidebar: its records, then who works in it and how, under a label. The workbench is the console's home. */
export const WORKSPACE_NAV: { label?: 'console.nav.administration'; sections: WorkspaceSection[] }[] = [
  {
    sections: [
      { path: CONSOLE_PATH, label: 'console.nav.workbench', icon: 'workbench' },
      { path: RELEASE_LOG_PATH, label: 'console.nav.releaseLog', icon: 'releases' },
      { path: CHANGELOG_PATH, label: 'console.nav.changelog', icon: 'changelog' },
    ],
  },
  {
    label: 'console.nav.administration',
    sections: [
      { path: MEMBERS_PATH, label: 'console.nav.members', icon: 'members' },
      { path: SETTINGS_PATH, label: 'console.nav.settings', icon: 'settings' },
    ],
  },
];

/** The accounts the sign-in page suggests for the demo, one per role; every member signs in with the demo password. */
export const DEMO_ACCOUNTS: { account: string; role: Role }[] = [
  { account: 'lin.fang', role: 'admin' },
  { account: 'zhou.yu', role: 'editor' },
  { account: 'he.ming', role: 'viewer' },
];

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

/** A section of a benchmark in the sidebar; the label is a message key, and the count is the benchmark's figure the item shows. */
export interface BenchmarkSection {
  section: string;
  label: 'console.nav.overview' | 'console.nav.tasks' | 'console.nav.runs' | 'console.nav.models' | 'console.nav.analysis' | 'console.nav.collections' | 'console.nav.reports' | 'console.nav.releases';
  icon: NavIcon;
  count?: (benchmark: ConsoleBenchmark) => number;
}

/** A benchmark's sections in the sidebar: its records first, then what it shows the public, under a label. */
export const BENCHMARK_NAV: { label?: 'console.nav.publication'; sections: BenchmarkSection[] }[] = [
  {
    sections: [
      { section: '', label: 'console.nav.overview', icon: 'overview' },
      { section: 'tasks', label: 'console.nav.tasks', icon: 'tasks', count: benchmark => benchmark.taskCount },
      { section: 'runs', label: 'console.nav.runs', icon: 'runs', count: benchmark => benchmark.runCount },
      { section: 'models', label: 'console.nav.models', icon: 'models', count: benchmark => new Set(benchmark.entrants.map(entrant => entrant.model.id)).size },
      { section: 'analysis', label: 'console.nav.analysis', icon: 'analysis' },
    ],
  },
  {
    label: 'console.nav.publication',
    sections: [
      { section: 'collections', label: 'console.nav.collections', icon: 'collections' },
      { section: 'reports', label: 'console.nav.reports', icon: 'reports' },
      { section: 'releases', label: 'console.nav.releases', icon: 'releases' },
    ],
  },
];
