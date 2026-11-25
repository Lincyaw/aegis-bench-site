import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AnalysisPage } from './analysis/AnalysisPage';
import { HuntPage } from './analysis/HuntPage';
import { BenchmarkOverviewPage } from './benchmarks/BenchmarkOverviewPage';
import { BenchmarkPage } from './benchmarks/BenchmarkPage';
import { ConsoleLayout } from './console/ConsoleLayout';
import { ConsoleError, ConsoleNotFound } from './console/ConsolePages';
import { SignInPage } from './console/SignInPage';
import { BenchmarksPage } from './benchmarks/BenchmarksPage';
import { CollectionListPage } from './collections/CollectionListPage';
import { CollectionPage } from './collections/CollectionPage';
import { LocaleRoot } from './i18n/LocaleRouting';
import { LOCALES, LOCALE_PREFIX } from './i18n/locales';
import { LeaderboardPage } from './leaderboard/LeaderboardPage';
import { MembersPage } from './members/MembersPage';
import { ModelDetailPage } from './models/ModelDetailPage';
import { ModelListPage } from './models/ModelListPage';
import { ModelPage } from './models/ModelPage';
import { BenchmarkReleasesPage } from './releases/BenchmarkReleasesPage';
import { ReleaseLogPage } from './releases/ReleaseLogPage';
import { ReleasePage } from './releases/ReleasePage';
import { ReportListPage } from './reports/ReportListPage';
import { ReportPage, ReportsPage } from './reports/ReportsPage';
import { RunDetailPage } from './runs/RunDetailPage';
import { RunListPage } from './runs/RunListPage';
import { RunRecordsPage } from './runs/RunRecordsPage';
import { SettingsPage } from './settings/SettingsPage';
import { SiteLayout, type RouteHandle } from './site/SiteLayout';
import { PageError, PendingPage } from './site/SitePages';
import { TaskDetailPage } from './tasks/TaskDetailPage';
import { TaskFilesPage } from './tasks/TaskFilesPage';
import { TaskListPage } from './tasks/TaskListPage';
import { ChangelogPage } from './workspace/ChangelogPage';
import { WorkbenchPage } from './workspace/WorkbenchPage';

/** The site's pages, built afresh for each locale's root so that no route object has two parents. */
export function sitePages(): RouteObject[] {
  return [
    {
      index: true,
      // The landing page brings three.js and anime.js, so it loads on its own.
      lazy: async () => ({ Component: (await import('./landing/LandingPage')).LandingPage }),
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
          { path: 'benchmarks/:benchmarkId/models', element: <ModelListPage /> },
          { path: 'benchmarks/:benchmarkId/models/:modelId', element: <ModelDetailPage /> },
          { path: 'benchmarks/:benchmarkId/analysis', element: <AnalysisPage /> },
          { path: 'benchmarks/:benchmarkId/analysis/:huntId', element: <HuntPage /> },
          { path: 'benchmarks/:benchmarkId/collections', element: <CollectionListPage /> },
          { path: 'benchmarks/:benchmarkId/collections/:tag', element: <CollectionPage /> },
          { path: 'benchmarks/:benchmarkId/reports', element: <ReportListPage /> },
          // The editor compiles MDX in the browser, so it loads on its own.
          { path: 'benchmarks/:benchmarkId/reports/:reportId', lazy: async () => ({ Component: (await import('./reports/ReportEditorPage')).ReportEditorPage }) },
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
