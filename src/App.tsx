import { Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { SiteFooter, SiteNav } from './components/SiteChrome';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
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
    element: <Layout />,
    children: [
      { path: '/', element: <BenchmarksPage /> },
      { path: '/benchmarks', element: <BenchmarksPage /> },
      { path: '/benchmarks/:benchmarkId', element: <BenchmarkPage /> },
      { path: '/leaderboard', element: <LeaderboardPage /> },
      { path: '*', element: <PendingPage /> },
    ],
  },
]);
