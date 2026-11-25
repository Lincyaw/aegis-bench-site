import { useMutation, useQueryClient, useSuspenseInfiniteQuery, useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { useLocale } from '../i18n/localeContext';
import { api, languageHeader, nextPageOffset, responseBody } from './client';
import type { ReviewFilter, RunEventKind, RunOutcome, SessionState, SignInRequest, TaskOrder, TaskSpread } from './types';

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

/** One benchmark of the console's list; an id the list lacks fails the page. */
export function useConsoleBenchmark(benchmarkId: string) {
  const benchmark = useConsoleBenchmarks().find(candidate => candidate.id === benchmarkId);
  if (!benchmark) {
    throw new Error(`no benchmark ${benchmarkId}`);
  }
  return benchmark;
}

/** What the console's task list asks for: the filters and the page. */
export interface ConsoleTaskQuery {
  q: string;
  tag: string;
  spread?: TaskSpread;
  order: TaskOrder;
  offset: number;
}

/** One page of a benchmark's tasks; the page stays the same in every language, but its combination names do not. */
export function useConsoleTaskPage(benchmarkId: string, query: ConsoleTaskQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'tasks', benchmarkId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks', {
      params: { path: { benchmarkId }, query: { q: query.q, tag: query.tag, spread: query.spread, order: query.order, offset: query.offset, limit: pageSize }, header: languageHeader(locale) },
    })),
  }).data;
}

export function useConsoleTask(benchmarkId: string, taskId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'task', benchmarkId, taskId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}', { params: { path: { benchmarkId, taskId }, header: languageHeader(locale) } })),
  }).data;
}

/** A task's grading is a record, so it is the same in every language. */
export function useTaskGrading(benchmarkId: string, taskId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskGrading', benchmarkId, taskId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/grading', { params: { path: { benchmarkId, taskId } } })),
  }).data;
}

export function useTaskReference(benchmarkId: string, taskId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskReference', benchmarkId, taskId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/reference', { params: { path: { benchmarkId, taskId } } })),
  }).data;
}

export function useTaskResults(benchmarkId: string, taskId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskResults', benchmarkId, taskId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/results', { params: { path: { benchmarkId, taskId }, header: languageHeader(locale) } })),
  }).data;
}

export function useTaskCheckResults(benchmarkId: string, taskId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskCheckResults', benchmarkId, taskId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/check-results', { params: { path: { benchmarkId, taskId }, header: languageHeader(locale) } })),
  }).data;
}

export function useTaskRevisions(benchmarkId: string, taskId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskRevisions', benchmarkId, taskId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/revisions', { params: { path: { benchmarkId, taskId } } })),
  }).data;
}

/** One directory of a task's Harbor directory as the console reads it, every file included, a page of entries at a time. */
export function useConsoleTaskEntryPages(benchmarkId: string, taskId: string, dir: string, pageSize: number) {
  return useSuspenseInfiniteQuery({
    queryKey: [CONSOLE_QUERY, 'taskEntries', benchmarkId, taskId, dir, pageSize],
    queryFn: ({ pageParam }) => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/files', { params: { path: { benchmarkId, taskId }, query: { dir, offset: pageParam, limit: pageSize } } })),
    initialPageParam: 0,
    getNextPageParam: nextPageOffset,
  });
}

export function useConsoleTaskFile(benchmarkId: string, taskId: string, path: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskFile', benchmarkId, taskId, path],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/file', { params: { path: { benchmarkId, taskId }, query: { path } } })),
  }).data;
}

/** What the console's run list asks for: the filters and the page. */
export interface ConsoleRunQuery {
  q: string;

  /** A model and harness pair as "<model id>-<harness id>"; every pair when empty */
  combination: string;

  outcome?: RunOutcome;
  review?: ReviewFilter;
  offset: number;
}

export function useConsoleRunPage(benchmarkId: string, query: ConsoleRunQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'runs', benchmarkId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/runs', {
      params: {
        path: { benchmarkId }, header: languageHeader(locale),
        query: { q: query.q, combination: query.combination, outcome: query.outcome, review: query.review, offset: query.offset, limit: pageSize },
      },
    })),
  }).data;
}

export function useConsoleRun(runId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'run', runId, locale],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}', { params: { path: { runId }, header: languageHeader(locale) } })),
  }).data;
}

/** One page of a run's trajectory as the console reads it; a trajectory is a record, the same in every language. */
export function useConsoleTrajectoryPage(runId: string, offset: number, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'trajectory', runId, offset, pageSize],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/trajectory/steps', { params: { path: { runId }, query: { offset, limit: pageSize } } })),
  }).data;
}

/** What the event list of a run asks for. */
export interface RunEventQuery {
  kind?: RunEventKind;
  q: string;
  offset: number;
}

export function useRunEvents(runId: string, query: RunEventQuery, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'events', runId, query, pageSize],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/events', { params: { path: { runId }, query: { kind: query.kind, q: query.q, offset: query.offset, limit: pageSize } } })),
  }).data;
}

export function useConsoleModels(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'models', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}

export function useConsoleModel(benchmarkId: string, modelId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'model', benchmarkId, modelId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models/{modelId}', { params: { path: { benchmarkId, modelId }, header: languageHeader(locale) } })),
  }).data;
}

/** What a model's task list asks for: one harness or all, the filters and the page. */
export interface ModelTaskQuery {
  harness: string;
  q: string;
  spread?: TaskSpread;
  order: TaskOrder;
  offset: number;
}

export function useModelTaskPage(benchmarkId: string, modelId: string, query: ModelTaskQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'modelTasks', benchmarkId, modelId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models/{modelId}/tasks', {
      params: {
        path: { benchmarkId, modelId }, header: languageHeader(locale),
        query: { harness: query.harness, q: query.q, spread: query.spread, order: query.order, offset: query.offset, limit: pageSize },
      },
    })),
  }).data;
}

export function useBenchmarkOverview(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'overview', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/overview', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}
