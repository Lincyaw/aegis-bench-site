import { Outlet, ScrollRestoration, createBrowserRouter, useMatches } from 'react-router-dom';
import { SiteFooter, SiteNav } from './components/SiteChrome';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ModelPage } from './pages/ModelPage';
import { RunRecordsPage } from './pages/RunRecordsPage';
import { PendingPage } from './pages/PendingPage';

/** Route handle of a page that fills the window below the nav and scrolls inside its own panes. */
interface RouteHandle { fillsWindow?: boolean }

function Layout() {
  const fillsWindow = useMatches().some(match => (match.handle as RouteHandle | undefined)?.fillsWindow);
  return (
    <>
      <SiteNav />
      <main><Outlet /></main>
      {!fillsWindow && <SiteFooter />}
      <ScrollRestoration />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    // The landing page brings three.js and anime.js, so it loads on its own.
    lazy: async () => {
      const { LandingPage } = await import('./landing/LandingPage');
      return { Component: () => <><LandingPage /><ScrollRestoration /></> };
    },
  },
  {
    element: <Layout />,
    children: [
      { path: '/benchmarks', element: <BenchmarksPage /> },
      { path: '/benchmarks/:benchmarkId', element: <BenchmarkPage /> },
      { path: '/benchmarks/:benchmarkId/runs', element: <RunRecordsPage />, handle: { fillsWindow: true } satisfies RouteHandle },
      { path: '/leaderboard', element: <LeaderboardPage /> },
      { path: '/models/:modelId', element: <ModelPage /> },
      { path: '*', element: <PendingPage /> },
    ],
  },
]);
