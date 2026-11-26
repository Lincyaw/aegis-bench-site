import { ABOUT_PATH, BENCHMARKS_PATH, LEADERBOARD_PATH, METHODOLOGY_PATH, REPORTS_PATH, SITE_CHANGELOG_PATH } from '../../routes/site';

/** The site's sections in the nav; labels are message keys. */
export const NAV_LINKS = [
  { to: LEADERBOARD_PATH, label: 'site.nav.leaderboard' },
  { to: BENCHMARKS_PATH, label: 'site.nav.benchmarks' },
  { to: REPORTS_PATH, label: 'site.nav.reports' },
  { to: ABOUT_PATH, label: 'site.nav.about' },
] as const;

/** The nav's sections and the pages only the footer lists. */
export const FOOTER_LINKS = [
  ...NAV_LINKS,
  { to: METHODOLOGY_PATH, label: 'site.nav.methodology' },
  { to: SITE_CHANGELOG_PATH, label: 'site.nav.changelog' },
] as const;
