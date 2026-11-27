import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LocaleRoot } from './i18n/LocaleRouting';
import { LOCALES, LOCALE_PREFIX } from './i18n/locales';
import { ConsoleLayout } from './pages/console/ConsoleLayout';
import { ConsoleError, ConsoleNotFound } from './pages/console/ConsolePages';
import { SignInPage } from './pages/console/SignInPage';
import { AnalysisPage } from './pages/console/analysis/AnalysisPage';
import { HuntPage } from './pages/console/analysis/HuntPage';
import { CollectionListPage } from './pages/console/collections/CollectionListPage';
import { CollectionPage } from './pages/console/collections/CollectionPage';
import { MembersPage } from './pages/console/members/MembersPage';
import { ModelDetailPage } from './pages/console/models/ModelDetailPage';
import { ModelListPage } from './pages/console/models/ModelListPage';
import { BenchmarkOverviewPage } from './pages/console/overview/BenchmarkOverviewPage';
import { BenchmarkReleasesPage } from './pages/console/releases/BenchmarkReleasesPage';
import { ReleaseLogPage } from './pages/console/releases/ReleaseLogPage';
import { ReleasePage } from './pages/console/releases/ReleasePage';
import { ReportListPage } from './pages/console/reports/ReportListPage';
import { RunDetailPage } from './pages/console/runs/RunDetailPage';
import { RunListPage } from './pages/console/runs/RunListPage';
import { SettingsPage } from './pages/console/settings/SettingsPage';
import { TaskDetailPage } from './pages/console/tasks/TaskDetailPage';
import { TaskListPage } from './pages/console/tasks/TaskListPage';
import { ChangelogPage } from './pages/console/workspace/ChangelogPage';
import { WorkbenchPage } from './pages/console/workspace/WorkbenchPage';
import { SiteLayout } from './pages/site/SiteLayout';
import { PageError, PendingPage } from './pages/site/SitePages';
import { BenchmarkPage } from './pages/site/benchmarks/BenchmarkPage';
import { BenchmarksPage } from './pages/site/benchmarks/BenchmarksPage';
import { LeaderboardPage } from './pages/site/leaderboard/LeaderboardPage';
import { ModelPage } from './pages/site/models/ModelPage';
import { ReportPage, ReportsPage } from './pages/site/reports/ReportsPage';
import { RunRecordsPage } from './pages/site/runs/RunRecordsPage';
import { TaskFilesPage } from './pages/site/tasks/TaskFilesPage';
import { nestedRoute, type RouteHandle } from './routes/address';
import { CONSOLE_PATH, CONSOLE_ROUTES, SIGN_IN_PATH } from './routes/console';
import { SITE_ROUTES } from './routes/site';

/** A route of the site as the locale roots nest it. */
function siteRoute(pattern: string): string {
  return nestedRoute('', pattern);
}

/** A route of the console as the console's layout nests it. */
function consoleRoute(pattern: string): string {
  return nestedRoute(CONSOLE_PATH, pattern);
}

/** The site's pages, built afresh for each locale's root so that no route object has two parents. */
export function sitePages(): RouteObject[] {
  return [
    {
      index: true,
      // The landing page brings three.js and anime.js, so it loads on its own.
      lazy: async () => ({ Component: (await import('./pages/site/landing/LandingPage')).LandingPage }),
      hydrateFallbackElement: null,
    },
    {
      element: <SiteLayout />,
      children: [{
        errorElement: <PageError />,
        children: [
          { path: siteRoute(SITE_ROUTES.benchmarks), element: <BenchmarksPage /> },
          { path: siteRoute(SITE_ROUTES.benchmark), element: <BenchmarkPage /> },
          { path: siteRoute(SITE_ROUTES.runRecords), element: <RunRecordsPage />, handle: { fillsWindow: true } satisfies RouteHandle },
          { path: siteRoute(SITE_ROUTES.taskFiles), element: <TaskFilesPage />, handle: { fillsWindow: true } satisfies RouteHandle },
          { path: siteRoute(SITE_ROUTES.leaderboard), element: <LeaderboardPage /> },
          { path: siteRoute(SITE_ROUTES.model), element: <ModelPage /> },
          { path: siteRoute(SITE_ROUTES.reports), element: <ReportsPage /> },
          { path: siteRoute(SITE_ROUTES.report), element: <ReportPage /> },
          { path: '*', element: <PendingPage /> },
        ],
      }],
    },
    { path: siteRoute(SIGN_IN_PATH), element: <SignInPage />, errorElement: <PageError /> },
    {
      path: siteRoute(CONSOLE_PATH),
      element: <ConsoleLayout />,
      children: [{
        errorElement: <ConsoleError />,
        children: [
          { index: true, element: <WorkbenchPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.releaseLog), element: <ReleaseLogPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.changelog), element: <ChangelogPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.members), element: <MembersPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.settings), element: <SettingsPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.benchmark), element: <BenchmarkOverviewPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.tasks), element: <TaskListPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.task), element: <TaskDetailPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.runs), element: <RunListPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.run), element: <RunDetailPage /> },
          // The replay lays out its graphs with dagre, so it loads on its own.
          {
            path: 'benchmarks/:benchmarkId/runs/:runId/replay',
            lazy: async () => ({ Component: (await import('./pages/console/runs/RunReplayPage')).RunReplayPage }),
            handle: { fillsWindow: true } satisfies RouteHandle,
          },
          { path: consoleRoute(CONSOLE_ROUTES.models), element: <ModelListPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.model), element: <ModelDetailPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.analysis), element: <AnalysisPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.hunt), element: <HuntPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.collections), element: <CollectionListPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.collection), element: <CollectionPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.reports), element: <ReportListPage /> },
          // The editor compiles MDX in the browser, so it loads on its own.
          { path: consoleRoute(CONSOLE_ROUTES.report), lazy: async () => ({ Component: (await import('./pages/console/reports/ReportEditorPage')).ReportEditorPage }) },
          { path: consoleRoute(CONSOLE_ROUTES.releases), element: <BenchmarkReleasesPage /> },
          { path: consoleRoute(CONSOLE_ROUTES.release), element: <ReleasePage /> },
          { path: '*', element: <ConsoleNotFound /> },
        ],
      }],
    },
  ];
}

/**
 * The default locale at the root, every other locale under its prefix, such as /en. The root is the build's base, so the
 * site also runs under a path such as a GitHub Pages project's.
 */
export const router = createBrowserRouter(LOCALES.map(locale => ({
  path: LOCALE_PREFIX[locale] || '/',
  element: <LocaleRoot locale={locale} />,
  children: sitePages(),
})), { basename: import.meta.env.BASE_URL });
