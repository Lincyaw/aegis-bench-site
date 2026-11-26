import { useSuspenseInfiniteQuery, useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { useLocale } from '../i18n/localeContext';
import { ApiError, HUGGING_FACE_UNREACHABLE_STATUS, HuggingFaceUnreachableError } from './errors';
import type { paths } from './schema';
import { API_ROOT } from './server';
import type { HuggingFaceUnreachableAnswer, LeaderboardView, Locale, TaskPage } from './types';

export type * from './types';

export const api = createClient<paths>({ baseUrl: API_ROOT });

/**
 * The body of an openapi-fetch response; an API error becomes a thrown ApiError, which the route's error boundary shows,
 * or, for records kept on Hugging Face that could not be read, a HuggingFaceUnreachableError the page shows in place.
 */
export async function responseBody<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request;
  if (data === undefined) {
    throw response.status === HUGGING_FACE_UNREACHABLE_STATUS ? new HuggingFaceUnreachableError(response, error as HuggingFaceUnreachableAnswer) : new ApiError(response, error);
  }
  return data;
}

/** Display names come back in the reader's language; see the API's LanguageHeader. */
export function languageHeader(locale: Locale) {
  return { 'Accept-Language': locale };
}

/** The key of the site's information, which the console's settings change. */
export const SITE_QUERY = 'site';

export function useSiteInfo() {
  return useSuspenseQuery({
    queryKey: [SITE_QUERY],
    queryFn: () => responseBody(api.GET('/site')),
  }).data;
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

/** The runs a benchmark's page shows as examples. */
export function useRecentRuns(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['recentRuns', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/recent-runs', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
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
 * loaded. Given a combination, the combination's own task list, whose rows carry each task's summary in the
 * combination's terms. Tasks are records, so their list is the same in every language.
 */
export function useTaskPages(benchmarkId: string, q: string, combination: string | undefined, pageSize: number) {
  return useSuspenseInfiniteQuery({
    queryKey: ['tasks', benchmarkId, q, combination, pageSize],
    queryFn: async ({ pageParam }): Promise<TaskPage> => {
      if (combination === undefined) {
        return responseBody(api.GET('/benchmarks/{benchmarkId}/tasks', { params: { path: { benchmarkId }, query: { q, offset: pageParam, limit: pageSize } } }));
      }
      const page = await responseBody(api.GET('/benchmarks/{benchmarkId}/combinations/{combination}/tasks', {
        params: { path: { benchmarkId, combination }, query: { q, offset: pageParam, limit: pageSize } },
      }));
      return { items: page.items.map(row => row.task), total: page.total };
    },
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

/** A combination's runs, a page of tasks matching a search at a time; each task's pass rate is the combination's. */
export function useCombinationTaskPages(benchmarkId: string, combination: string, q: string, pageSize: number) {
  return useSuspenseInfiniteQuery({
    queryKey: ['combinationTasks', benchmarkId, combination, q, pageSize],
    queryFn: ({ pageParam }) => responseBody(api.GET('/benchmarks/{benchmarkId}/combinations/{combination}/tasks', {
      params: { path: { benchmarkId, combination }, query: { q, offset: pageParam, limit: pageSize } },
    })),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

export function useTask(benchmarkId: string, taskId: string) {
  return useSuspenseQuery({
    queryKey: ['task', benchmarkId, taskId],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}', { params: { path: { benchmarkId, taskId } } })),
  }).data;
}

/** One directory of a task's Harbor directory, a page of entries at a time; the root when dir is empty. */
export function useTaskEntryPages(benchmarkId: string, taskId: string, dir: string, pageSize: number) {
  return useSuspenseInfiniteQuery({
    queryKey: ['taskEntries', benchmarkId, taskId, dir, pageSize],
    queryFn: ({ pageParam }) => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/files', { params: { path: { benchmarkId, taskId }, query: { dir, offset: pageParam, limit: pageSize } } })),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

export function useTaskFile(benchmarkId: string, taskId: string, path: string) {
  return useSuspenseQuery({
    queryKey: ['taskFile', benchmarkId, taskId, path],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/file', { params: { path: { benchmarkId, taskId }, query: { path } } })),
  }).data;
}

/** A task's runs by published combination; given a combination, its runs alone, and the task's pass rate over them. */
export function useTaskRuns(benchmarkId: string, taskId: string, combination: string | undefined) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['taskRuns', benchmarkId, taskId, combination, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/runs', { params: { path: { benchmarkId, taskId }, query: { combination }, header: languageHeader(locale) } })),
  }).data;
}

export function useRun(runId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['run', runId, locale],
    queryFn: () => responseBody(api.GET('/runs/{runId}', { params: { path: { runId }, header: languageHeader(locale) } })),
  }).data;
}

/** Published runs of a task side by side. */
export function useTaskComparison(benchmarkId: string, taskId: string, runs: string[]) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: ['taskComparison', benchmarkId, taskId, runs, locale],
    queryFn: () => responseBody(api.GET('/benchmarks/{benchmarkId}/tasks/{taskId}/comparison', {
      params: { path: { benchmarkId, taskId }, query: { runs }, header: languageHeader(locale) },
    })),
  }).data;
}

/** Whole trajectories of several runs, read together. A trajectory is a record, so it is the same in every language. */
export function useTrajectories(runIds: string[]) {
  return useSuspenseQueries({
    queries: runIds.map(runId => ({
      queryKey: ['trajectory', runId],
      queryFn: () => responseBody(api.GET('/runs/{runId}/trajectory', { params: { path: { runId } } })),
    })),
  }).map(query => query.data);
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
