import { useMutation, useQueryClient, useSuspenseInfiniteQuery, useSuspenseQueries, useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { useLocale } from '../i18n/localeContext';
import { SITE_QUERY, api, languageHeader, nextPageOffset, responseBody } from './client';
import type {
  ChangelogQuery, CombinationScope, ConsoleRunQuery, ConsoleTaskQuery, HuntTrialQuery, Invitation, ModelTaskQuery, NewReport, ReleaseContent, ReportDraft,
  ReportEdit, ReportStatus, ReviewRequest, Role, RunEventQuery, SessionState, SettingsChange, SignInRequest, TaskOrder,
} from './types';

/** Every console query key starts with this, so signing in or out can drop what the previous session read. */
export const CONSOLE_QUERY = 'console';

export const SESSION_QUERY_KEY = [CONSOLE_QUERY, 'session'];

/** The second part of the query keys that mutations refresh or drop, written once so each refresh finds what it means to. */
const MEMBERS_QUERY = 'members';
const SETTINGS_QUERY = 'settings';
const WORKBENCH_QUERY = 'workbench';
const RELEASES_QUERY = 'releases';
const RELEASE_QUERY = 'release';
const REPORTS_QUERY = 'reports';
const REPORT_QUERY = 'report';

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

/** The signed-in member; the console's layout renders its pages only for one. */
export function useConsoleUser() {
  const { user } = useConsoleSession();
  if (!user) {
    throw new Error('the console renders its pages only for a signed-in member');
  }
  return user;
}

export function useMembers() {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, MEMBERS_QUERY],
    queryFn: () => responseBody(api.GET('/console/members')),
  }).data;
}

/** After the members change, the list is read again, and so is the session, whose own role or membership may have changed. */
export function refreshAfterMembers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, MEMBERS_QUERY] });
  void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitation: Invitation) => responseBody(api.POST('/console/members', { body: invitation })),
    onSuccess: () => refreshAfterMembers(queryClient),
  });
}

export function useChangeRole(account: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: Role) => responseBody(api.PUT('/console/members/{account}/role', { params: { path: { account } }, body: { role } })),
    onSuccess: () => refreshAfterMembers(queryClient),
  });
}

export function useRemoveMember(account: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.DELETE('/console/members/{account}', { params: { path: { account } } })),
    onSuccess: () => refreshAfterMembers(queryClient),
  });
}

export function useSettings() {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, SETTINGS_QUERY],
    queryFn: () => responseBody(api.GET('/console/settings')),
  }).data;
}

/** Saving the settings also changes what the public site says about the workspace, so its site information is read again. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: SettingsChange) => responseBody(api.PUT('/console/settings', { body: change })),
    onSuccess: settings => {
      queryClient.setQueryData([CONSOLE_QUERY, SETTINGS_QUERY], settings);
      void queryClient.invalidateQueries({ queryKey: [SITE_QUERY] });
    },
  });
}

export function useConsoleBenchmarks() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'benchmarks', locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks', { params: { header: languageHeader(locale) } })),
  }).data;
}

/** One benchmark; an id the console lacks fails the page. */
export function useConsoleBenchmark(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'benchmark', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
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

/** A task, with what the runs of the combinations a scope keeps to come to. */
export function useConsoleTask(benchmarkId: string, taskId: string, { model, harness }: CombinationScope) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'task', benchmarkId, taskId, model, harness, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}', { params: { path: { benchmarkId, taskId }, query: { model, harness }, header: languageHeader(locale) } })),
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

/** The runs on a task of each combination a scope keeps to, and the runs that check the task itself. */
export function useTaskResults(benchmarkId: string, taskId: string, { model, harness }: CombinationScope) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskResults', benchmarkId, taskId, model, harness, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/results', { params: { path: { benchmarkId, taskId }, query: { model, harness }, header: languageHeader(locale) } })),
  }).data;
}

/** Runs of a task side by side, in the order given. */
export function useConsoleTaskComparison(benchmarkId: string, taskId: string, runs: string[]) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskComparison', benchmarkId, taskId, runs, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/comparison', {
      params: { path: { benchmarkId, taskId }, query: { runs }, header: languageHeader(locale) },
    })),
  }).data;
}

/** Each check of a task against each combination a scope keeps to. */
export function useTaskCheckResults(benchmarkId: string, taskId: string, { model, harness }: CombinationScope) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskCheckResults', benchmarkId, taskId, model, harness, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/check-results', {
      params: { path: { benchmarkId, taskId }, query: { model, harness }, header: languageHeader(locale) },
    })),
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

export function useConsoleRunPage(benchmarkId: string, query: ConsoleRunQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'runs', benchmarkId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/runs', {
      params: {
        path: { benchmarkId }, header: languageHeader(locale),
        query: { q: query.q, task: query.task, model: query.model, harness: query.harness, outcome: query.outcome, review: query.review, offset: query.offset, limit: pageSize },
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

/** Runs' whole trajectories, every step at once, in the order given; a trajectory is a record, the same in every language. */
export function useConsoleTrajectories(runIds: string[]) {
  return useSuspenseQueries({
    queries: runIds.map(runId => ({
      queryKey: [CONSOLE_QUERY, 'trajectory', runId],
      queryFn: () => responseBody(api.GET('/console/runs/{runId}/trajectory', { params: { path: { runId } } })),
    })),
  }).map(query => query.data);
}

/** A run replayed over its task's world: the benchmark's layers, the world before the run, and the run's footprint. */
export function useConsoleRunReplay(runId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'replay', runId, locale],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/replay', { params: { path: { runId }, header: languageHeader(locale) } })),
  }).data;
}

/** One page of a run's trajectory as the console reads it. */
export function useConsoleTrajectoryPage(runId: string, offset: number, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'trajectory', runId, offset, pageSize],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/trajectory/steps', { params: { path: { runId }, query: { offset, limit: pageSize } } })),
  }).data;
}

export function useRunEvents(runId: string, query: RunEventQuery, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'events', runId, query, pageSize],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/events', { params: { path: { runId }, query: { kind: query.kind, q: query.q, offset: query.offset, limit: pageSize } } })),
  }).data;
}

/** One event of a run with its whole record, read when its row is opened; a record is the same in every language. */
export function useRunEvent(runId: string, index: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'event', runId, index],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/events/{index}', { params: { path: { runId, index } } })),
  }).data;
}

export function useConsoleModels(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'models', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}

/** A model over the tasks its page keeps to; the page's search narrows only its task list. */
export function useConsoleModel(benchmarkId: string, modelId: string, { tag, task }: Pick<ModelTaskQuery, 'tag' | 'task'>) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'model', benchmarkId, modelId, tag, task, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models/{modelId}', { params: { path: { benchmarkId, modelId }, query: { tag, task }, header: languageHeader(locale) } })),
  }).data;
}

export function useModelTaskPage(benchmarkId: string, modelId: string, query: ModelTaskQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'modelTasks', benchmarkId, modelId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/models/{modelId}/tasks', {
      params: {
        path: { benchmarkId, modelId }, header: languageHeader(locale),
        query: { harness: query.harness, tag: query.tag, task: query.task, q: query.q, spread: query.spread, order: query.order, offset: query.offset, limit: pageSize },
      },
    })),
  }).data;
}

/** The collections are read from the tasks' tags, which are records, so they are the same in every language. */
export function useCollections(benchmarkId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'collections', benchmarkId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/collections', { params: { path: { benchmarkId } } })),
  }).data;
}

export function useCollectionModels(benchmarkId: string, tag: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'collectionModels', benchmarkId, tag, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/collections/{tag}/models', { params: { path: { benchmarkId, tag }, header: languageHeader(locale) } })),
  }).data;
}

export function useCollectionMatrix(benchmarkId: string, tag: string, order: TaskOrder, offset: number, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'collectionMatrix', benchmarkId, tag, order, offset, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/collections/{tag}/matrix', {
      params: { path: { benchmarkId, tag }, query: { order, offset, limit: pageSize }, header: languageHeader(locale) },
    })),
  }).data;
}

/** A hunt's question, facets and verdicts are records, the same in every language. */
export function useHunts(benchmarkId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'hunts', benchmarkId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/hunts', { params: { path: { benchmarkId } } })),
  }).data;
}

export function useHuntTrials(benchmarkId: string, huntId: string, query: HuntTrialQuery, pageSize: number) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'huntTrials', benchmarkId, huntId, query, pageSize, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/hunts/{huntId}/trials', {
      params: { path: { benchmarkId, huntId }, query: { facet: query.facet, verdict: query.verdict, offset: query.offset, limit: pageSize }, header: languageHeader(locale) },
    })),
  }).data;
}

export function useRunHunts(runId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'runHunts', runId],
    queryFn: () => responseBody(api.GET('/console/runs/{runId}/hunts', { params: { path: { runId } } })),
  }).data;
}

export function useWorkbench() {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, WORKBENCH_QUERY, locale],
    queryFn: () => responseBody(api.GET('/console/workbench', { params: { header: languageHeader(locale) } })),
  }).data;
}

/** Task versions are records, the same in every language. */
export function useChangelog(query: ChangelogQuery, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'changelog', query, pageSize],
    queryFn: () => responseBody(api.GET('/console/changelog', { params: { query: { benchmarkId: query.benchmark, change: query.change, offset: query.offset, limit: pageSize } } })),
  }).data;
}

export function useReleaseOverview() {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, RELEASES_QUERY],
    queryFn: () => responseBody(api.GET('/console/releases')),
  }).data;
}

export function useBenchmarkReleases(benchmarkId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, RELEASES_QUERY, benchmarkId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/releases', { params: { path: { benchmarkId } } })),
  }).data;
}

export function useRelease(releaseId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, RELEASE_QUERY, releaseId],
    queryFn: () => responseBody(api.GET('/console/releases/{releaseId}', { params: { path: { releaseId } } })),
  }).data;
}

/**
 * After a release changes, everything that shows releases is read again, and so is every public page, which shows the
 * current releases.
 */
export function refreshAfterRelease(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== CONSOLE_QUERY || [RELEASES_QUERY, RELEASE_QUERY, WORKBENCH_QUERY].includes(String(query.queryKey[1])) });
}

export function useCreateDraft(benchmarkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.POST('/console/benchmarks/{benchmarkId}/releases', { params: { path: { benchmarkId } } })),
    onSuccess: () => refreshAfterRelease(queryClient),
  });
}

export function useUpdateDraft(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: ReleaseContent) => responseBody(api.PUT('/console/releases/{releaseId}', { params: { path: { releaseId } }, body: content })),
    onSuccess: () => refreshAfterRelease(queryClient),
  });
}

export function usePublishRelease(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => responseBody(api.POST('/console/releases/{releaseId}/publish', { params: { path: { releaseId } }, body: { note } })),
    onSuccess: () => refreshAfterRelease(queryClient),
  });
}

export function useRestoreRelease(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => responseBody(api.POST('/console/releases/{releaseId}/restore', { params: { path: { releaseId } }, body: { note } })),
    onSuccess: () => refreshAfterRelease(queryClient),
  });
}

/** A discarded draft no longer exists, so it is dropped rather than read again. */
export function useDiscardDraft(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.DELETE('/console/releases/{releaseId}', { params: { path: { releaseId } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [CONSOLE_QUERY, RELEASE_QUERY, releaseId], exact: true });
      refreshAfterRelease(queryClient);
    },
  });
}

/** The report drafts that name a benchmark, newest first; those in one status when it is given. */
export function useReportDrafts(benchmarkId: string, status?: ReportStatus) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, REPORTS_QUERY, benchmarkId, status],
    queryFn: () => responseBody(api.GET('/console/reports', { params: { query: { benchmarkId, status } } })),
  }).data;
}

export function useReportDraft(reportId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, REPORT_QUERY, reportId],
    queryFn: () => responseBody(api.GET('/console/reports/{reportId}', { params: { path: { reportId } } })),
  }).data;
}

/** After a draft changes, the lists are read again and the draft's own answer is kept as it is. */
export function refreshAfterReport(queryClient: QueryClient, draft: ReportDraft) {
  queryClient.setQueryData([CONSOLE_QUERY, REPORT_QUERY, draft.id], draft);
  void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, REPORTS_QUERY] });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: NewReport) => responseBody(api.POST('/console/reports', { body: report })),
    onSuccess: draft => refreshAfterReport(queryClient, draft),
  });
}

export function useUpdateReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (edit: ReportEdit) => responseBody(api.PUT('/console/reports/{reportId}', { params: { path: { reportId } }, body: edit })),
    onSuccess: draft => refreshAfterReport(queryClient, draft),
  });
}

export function useSubmitReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.POST('/console/reports/{reportId}/submit', { params: { path: { reportId } } })),
    onSuccess: draft => refreshAfterReport(queryClient, draft),
  });
}

export function useReviewReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ReviewRequest) => responseBody(api.POST('/console/reports/{reportId}/reviews', { params: { path: { reportId } }, body: request })),
    onSuccess: draft => refreshAfterReport(queryClient, draft),
  });
}

/** A discarded draft no longer exists, so it is dropped rather than read again. */
export function useDiscardReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => responseBody(api.DELETE('/console/reports/{reportId}', { params: { path: { reportId } } })),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: [CONSOLE_QUERY, REPORT_QUERY, reportId], exact: true });
      void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, REPORTS_QUERY] });
    },
  });
}

export function useBenchmarkOverview(benchmarkId: string) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'overview', benchmarkId, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/overview', { params: { path: { benchmarkId }, header: languageHeader(locale) } })),
  }).data;
}
