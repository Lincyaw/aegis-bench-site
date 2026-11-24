import './styles/base.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { worker } from './mocks/browser';
import { router } from './router';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

const root = document.getElementById('root');
if (!root) {
  throw new Error('index.html has no #root element');
}

// The demo has no backend: the mock service worker answers every /api request.
await worker.start({ onUnhandledFrame: 'bypass', quiet: true });

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
