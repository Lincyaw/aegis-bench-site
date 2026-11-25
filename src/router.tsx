import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { BenchmarkOverviewPage } from './benchmarks/BenchmarkOverviewPage';
import { BenchmarkPage } from './benchmarks/BenchmarkPage';
import { ConsoleLayout } from './console/ConsoleLayout';
import { ConsoleError, ConsoleHome, ConsoleNotFound } from './console/ConsolePages';
import { SignInPage } from './console/SignInPage';
import { BenchmarksPage } from './benchmarks/BenchmarksPage';
import { LocaleRoot } from './i18n/LocaleRouting';
import { LOCALES, LOCALE_PREFIX } from './i18n/locales';
import { LeaderboardPage } from './leaderboard/LeaderboardPage';
import { ModelPage } from './models/ModelPage';
import { ReportPage, ReportsPage } from './reports/ReportsPage';
import { RunDetailPage } from './runs/RunDetailPage';
import { RunListPage } from './runs/RunListPage';
import { RunRecordsPage } from './runs/RunRecordsPage';
import { SiteLayout, type RouteHandle } from './site/SiteLayout';
import { PageError, PendingPage } from './site/SitePages';
import { TaskDetailPage } from './tasks/TaskDetailPage';
import { TaskFilesPage } from './tasks/TaskFilesPage';
import { TaskListPage } from './tasks/TaskListPage';

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
          { index: true, element: <ConsoleHome /> },
          { path: 'benchmarks/:benchmarkId', element: <BenchmarkOverviewPage /> },
          { path: 'benchmarks/:benchmarkId/tasks', element: <TaskListPage /> },
          { path: 'benchmarks/:benchmarkId/tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'benchmarks/:benchmarkId/runs', element: <RunListPage /> },
          { path: 'benchmarks/:benchmarkId/runs/:runId', element: <RunDetailPage /> },
          { path: '*', element: <ConsoleNotFound /> },
        ],
      }],
    },
  ];
}

/** The default locale at the root, every other locale under its prefix, such as /en. */
export const router = createBrowserRouter(LOCALES.map(locale => ({
  path: LOCALE_PREFIX[locale] || '/',
  element: <LocaleRoot locale={locale} />,
  children: sitePages(),
})));
