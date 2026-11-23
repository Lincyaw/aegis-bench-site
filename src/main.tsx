import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { worker } from './mocks/browser';
import { router } from './App';
import './styles/base.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

// The demo has no backend: the mock service worker answers every /api request.
await worker.start({ onUnhandledFrame: 'bypass', quiet: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
