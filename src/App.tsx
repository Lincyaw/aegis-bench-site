import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { SiteFooter, SiteNav } from './components/SiteChrome';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ModelPage } from './pages/ModelPage';
import { RunRecordsPage } from './pages/RunRecordsPage';
import { PendingPage } from './pages/PendingPage';

function Layout() {
  return (
    <>
      <SiteNav />
      <main><Outlet /></main>
      <SiteFooter />
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
      { path: '/benchmarks/:benchmarkId/runs', element: <RunRecordsPage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },
      { path: '/models/:modelId', element: <ModelPage /> },
      { path: '*', element: <PendingPage /> },
    ],
  },
]);
