import { useSuspenseInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { useLocale } from '../i18n/localeContext';
import type { paths } from './schema';
import { API_ROOT } from './server';
import type { LeaderboardView, Locale } from './types';

export type * from './types';

export const api = createClient<paths>({ baseUrl: API_ROOT });

/** The body of an openapi-fetch response; an API error becomes a thrown error, which the route's error boundary shows. */
export async function responseBody<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request;
  if (data === undefined) {
    throw new Error(`${response.status} ${response.url}: ${JSON.stringify(error)}`);
  }
  return data;
}

/** Display names come back in the reader's language; see the API's LanguageHeader. */
export function languageHeader(locale: Locale) {
  return { 'Accept-Language': locale };
}

export function useStages() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['stages', locale],
    queryFn: () => responseBody(api.GET('/stages', { params: { header: languageHeader(locale) } })),
  }).data;
}

export function useBenchmarks() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['benchmarks', locale],
    queryFn: () => responseBody(api.GET('/benchmarks', { params: { header: languageHeader(locale) } })),
  }).data;
}

export function useBenchmark(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['benchmark', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}

/** Where the page after those loaded starts, or undefined once the whole list is loaded. */
export function nextPageOffset<Page extends { items: unknown[]; total: number }>(last: Page, pages: Page[]): number | undefined {
  const loaded = pages.reduce((count, page) => count + page.items.length, 0);
  return loaded < last.total ? loaded : undefined;
}

/** The ranking a page at a time: each further page asks only for the entries after those already loaded. */
export function useLeaderboardPages(benchmarkId: string, view: LeaderboardView, pageSize: number) {
  const locale = useLocale();
  return useSuspenseInfiniteQuery({
    queryKey: ['leaderboard', benchmarkId, view, pageSize, locale],
    queryFn: ({ pageParam }) => responseBody(api.GET('/benchmarks/{benchmarkId}/leaderboard', { params: { path: { benchmarkId }, query: { view, offset: pageParam, limit: pageSize }, header: languageHeader(locale) } })),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

export function useCombinations(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['combinations', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/combinations', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}

/**
 * The tasks matching a search, a page at a time: each further page asks only for the tasks after those already
 * loaded. Tasks are records, so their list is the same in every language.
 */
export function useTaskPages(benchmarkId: string, q: string, pageSize: number) {
  return useSuspenseInfiniteQuery({
    queryKey: ['tasks', benchmarkId, q, pageSize],
    queryFn: ({ pageParam }) => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks', { params: { path: { benchmarkId }, query: { q, offset: pageParam, limit: pageSize } } })),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

export function useTaskRuns(benchmarkId: string, taskId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['taskRuns', benchmarkId, taskId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', { params: { path: { benchmarkId, taskId }, header: languageHeader(locale) } })),
  }).data;
}

export function useRun(runId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['run', runId, locale],
    queryFn: () => responseBody(api.GET('/runs/{runId}', { params: { path: { runId }, header: languageHeader(locale) } })),
  }).data;
}

/** One page of a run's trajectory. A trajectory is a record, so it is the same in every language. */
export function useTrajectoryPage(runId: string, offset: number, pageSize: number) {
  return useSuspenseQuery({
    queryKey: ['trajectory', runId, offset, pageSize],
    queryFn: () => responseBody(api.GET('/runs/{runId}/trajectory/steps', { params: { path: { runId }, query: { offset, limit: pageSize } } })),
  }).data;
}

export function useModelProfile(modelId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['model', modelId, locale],
    queryFn: () => responseBody(api.GET('/models/{modelId}', { params: { path: { modelId }, header: languageHeader(locale) } })),
  }).data;
}
