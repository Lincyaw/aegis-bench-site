import './ui/base.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { worker } from './mocks/browser';
import { router } from './router';
import { HintProvider } from './ui/hint';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html has no #root element');
}

// The demo has no backend: the mock service worker, served from the build's base, answers every /api request.
await worker.start({ serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` }, onUnhandledFrame: 'bypass', quiet: true });

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HintProvider>
        <RouterProvider router={router} />
      </HintProvider>
    </QueryClientProvider>
  </StrictMode>,
);
