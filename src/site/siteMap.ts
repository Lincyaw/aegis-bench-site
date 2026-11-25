export const BENCHMARKS_PATH = '/benchmarks';
export const LEADERBOARD_PATH = '/leaderboard';

/** The site's sections in the nav; labels are message keys. */
export const NAV_LINKS = [
  { to: LEADERBOARD_PATH, label: 'site.nav.leaderboard' },
  { to: BENCHMARKS_PATH, label: 'site.nav.benchmarks' },
  { to: '/reports', label: 'site.nav.reports' },
  { to: '/about', label: 'site.nav.about' },
] as const;

/** The nav's sections and the pages only the footer lists. */
export const FOOTER_LINKS = [
  ...NAV_LINKS,
  { to: '/methodology', label: 'site.nav.methodology' },
  { to: '/changelog', label: 'site.nav.changelog' },
] as const;

export const CONTACT_ANCHOR = 'contact';
export const CONTACT_PATH = `/about#${CONTACT_ANCHOR}`;

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

/** The leaderboard, opened on one benchmark when given. */
export function leaderboardPath(benchmarkId?: string): string {
  return benchmarkId ? `${LEADERBOARD_PATH}?bench=${benchmarkId}` : LEADERBOARD_PATH;
}

export function modelPath(modelId: string): string {
  return `/models/${modelId}`;
}

export function reportPath(slug: string): string {
  return `/reports/${slug}`;
}
