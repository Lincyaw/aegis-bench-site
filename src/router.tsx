import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LocaleRoot } from './i18n/LocaleRouting';
import { LOCALES, LOCALE_PREFIX } from './i18n/locales';
import { ConsoleLayout, type ConsoleRouteHandle } from './pages/console/ConsoleLayout';
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
import { SiteLayout, type RouteHandle } from './pages/site/SiteLayout';
import { PageError, PendingPage } from './pages/site/SitePages';
import { BenchmarkPage } from './pages/site/benchmarks/BenchmarkPage';
import { BenchmarksPage } from './pages/site/benchmarks/BenchmarksPage';
import { LeaderboardPage } from './pages/site/leaderboard/LeaderboardPage';
import { ModelPage } from './pages/site/models/ModelPage';
import { ReportPage, ReportsPage } from './pages/site/reports/ReportsPage';
import { RunRecordsPage } from './pages/site/runs/RunRecordsPage';
import { TaskFilesPage } from './pages/site/tasks/TaskFilesPage';

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
          { path: 'benchmarks', element: <BenchmarksPage /> },
          { path: 'benchmarks/:benchmarkId', element: <BenchmarkPage /> },
          { path: 'benchmarks/:benchmarkId/runs', element: <RunRecordsPage />, handle: { fillsWindow: true } satisfies RouteHandle },
          { path: 'benchmarks/:benchmarkId/tasks/:taskId', element: <TaskFilesPage />, handle: { fillsWindow: true } satisfies RouteHandle },
          { path: 'leaderboard', element: <LeaderboardPage /> },
          { path: 'models/:modelId', element: <ModelPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'reports/:slug', element: <ReportPage /> },
          { path: '*', element: <PendingPage /> },
        ],
      }],
    },
    { path: 'console/sign-in', element: <SignInPage />, errorElement: <PageError /> },
    {
      path: 'console',
      element: <ConsoleLayout />,
      children: [{
        errorElement: <ConsoleError />,
        children: [
          { index: true, element: <WorkbenchPage /> },
          { path: 'releases', element: <ReleaseLogPage /> },
          { path: 'changelog', element: <ChangelogPage /> },
          { path: 'members', element: <MembersPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'benchmarks/:benchmarkId', element: <BenchmarkOverviewPage /> },
          { path: 'benchmarks/:benchmarkId/tasks', element: <TaskListPage /> },
          { path: 'benchmarks/:benchmarkId/tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'benchmarks/:benchmarkId/runs', element: <RunListPage /> },
          { path: 'benchmarks/:benchmarkId/runs/:runId', element: <RunDetailPage /> },
          // The replay lays out its graphs with dagre, so it loads on its own.
          {
            path: 'benchmarks/:benchmarkId/runs/:runId/replay',
            lazy: async () => ({ Component: (await import('./pages/console/runs/RunReplayPage')).RunReplayPage }),
            handle: { fillsWindow: true } satisfies ConsoleRouteHandle,
          },
          { path: 'benchmarks/:benchmarkId/models', element: <ModelListPage /> },
          { path: 'benchmarks/:benchmarkId/models/:modelId', element: <ModelDetailPage /> },
          { path: 'benchmarks/:benchmarkId/analysis', element: <AnalysisPage /> },
          { path: 'benchmarks/:benchmarkId/analysis/:huntId', element: <HuntPage /> },
          { path: 'benchmarks/:benchmarkId/collections', element: <CollectionListPage /> },
          { path: 'benchmarks/:benchmarkId/collections/:tag', element: <CollectionPage /> },
          { path: 'benchmarks/:benchmarkId/reports', element: <ReportListPage /> },
          // The editor compiles MDX in the browser, so it loads on its own.
          { path: 'benchmarks/:benchmarkId/reports/:reportId', lazy: async () => ({ Component: (await import('./pages/console/reports/ReportEditorPage')).ReportEditorPage }) },
          { path: 'benchmarks/:benchmarkId/releases', element: <BenchmarkReleasesPage /> },
          { path: 'benchmarks/:benchmarkId/releases/:releaseId', element: <ReleasePage /> },
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
