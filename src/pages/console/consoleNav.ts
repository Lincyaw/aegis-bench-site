import type { ConsoleBenchmark } from '../../api/types';
import type { NavIcon } from '../../components/shell/NavIcons';
import { CHANGELOG_PATH, CONSOLE_PATH, MEMBERS_PATH, RELEASE_LOG_PATH, SETTINGS_PATH } from '../../routes/console';
import { benchmarkPath } from '../../routes/site';

/** The sidebar's choice for the workspace, beside the benchmarks; no benchmark id is spelt this way. */
export const WORKSPACE_CHOICE = 'workspace';

/** Where the console's link to the public site leads: the public page of the benchmark being read, or the public home. */
export function publicSitePathOf(benchmarkId: string | undefined): string {
  return benchmarkId ? benchmarkPath(benchmarkId) : '/';
}

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
