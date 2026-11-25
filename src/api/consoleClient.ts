import { useMutation, useQueryClient, useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { useLocale } from '../i18n/localeContext';
import { api, languageHeader, responseBody } from './client';
import type { SessionState, SignInRequest } from './types';

/** Every console query key starts with this, so signing in or out can drop what the previous session read. */
export const CONSOLE_QUERY = 'console';

export const SESSION_QUERY_KEY = [CONSOLE_QUERY, 'session'];

/**
 * Drops everything the previous session read and records the new session. The session's own query stays in the cache,
 * so the layout that observes it sees the change.
 */
export function startSession(queryClient: QueryClient, session: SessionState) {
  queryClient.removeQueries({ queryKey: [CONSOLE_QUERY], predicate: query => query.queryKey[1] !== SESSION_QUERY_KEY[1] });
  queryClient.setQueryData(SESSION_QUERY_KEY, session);
}

/** Who is signed in on this browser; the console's layout reads it before anything else. */
export function useConsoleSession() {
  return useSuspenseQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => responseBody(api.GET('/console/session')),
  }).data;
}

/** Signs in; the session cookie the answer sets carries the session from then on. A wrong password stays a mutation error. */
export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SignInRequest) => responseBody(api.POST('/console/session', { body: request })),
    onSuccess: session => startSession(queryClient, session),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.DELETE('/console/session')),
    onSuccess: session => startSession(queryClient, session),
  });
}

export function useConsoleBenchmarks() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'benchmarks', locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks', { params: { header: languageHeader(locale) } })),
  }).data;
}

export function useBenchmarkOverview(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'overview', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/overview', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}
