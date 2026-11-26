import { useMutation, useQueryClient, useSuspenseInfiniteQuery, useSuspenseQueries, useSuspenseQuery, type QueryClient } from '@tanstack/react-query';
import { useLocale } from '../i18n/localeContext';
import { SITE_QUERY, api, languageHeader, nextPageOffset, responseBody } from './client';
import type {
  HuntVerdict, Invitation, NewReport, ReleaseContent, ReportDraft, ReportEdit, ReviewFilter, ReviewRequest, RevisionChange, Role, RunEventKind, RunOutcome,
  SessionState, SettingsChange, SignInRequest, TaskOrder, TaskSpread,
} from './types';

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

/** The demo's mock server lets every member in with this password, and the sign-in page says so. */
export const DEMO_PASSWORD = 'demo';

/** The accounts the sign-in page suggests for the demo, one per role; the first is the one the demo opens with. */
export const DEMO_ACCOUNTS: { account: string; role: Role }[] = [
  { account: 'lin.fang', role: 'admin' },
  { account: 'zhou.yu', role: 'editor' },
  { account: 'he.ming', role: 'viewer' },
];

/**
 * Who is signed in on this browser; the console's layout reads it before anything else. The demo opens without asking:
 * a browser nobody is signed in on is signed in as the first demo account, and one that signs out stays out until the
 * page is loaded again.
 */
export function useConsoleSession() {
  return useSuspenseQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const session = await responseBody(api.GET('/console/session'));
      return session.user ? session : responseBody(api.POST('/console/session', { body: { account: DEMO_ACCOUNTS[0].account, password: DEMO_PASSWORD } }));
    },
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
    queryKey: [CONSOLE_QUERY, 'members'],
    queryFn: () => responseBody(api.GET('/console/members')),
  }).data;
}

/** After the members change, the list is read again, and so is the session, whose own role or membership may have changed. */
export function refreshAfterMembers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, 'members'] });
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
    queryKey: [CONSOLE_QUERY, 'settings'],
    queryFn: () => responseBody(api.GET('/console/settings')),
  }).data;
}

/** Saving the settings also changes what the public site says about the workspace, so its site information is read again. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: SettingsChange) => responseBody(api.PUT('/console/settings', { body: change })),
    onSuccess: settings => {
      queryClient.setQueryData([CONSOLE_QUERY, 'settings'], settings);
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

/** Runs of a task side by side, in the order given. */
export function useTaskComparison(benchmarkId: string, taskId: string, runs: string[]) {
  const locale = useLocale();
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'taskComparison', benchmarkId, taskId, runs, locale],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/tasks/{taskId}/comparison', {
      params: { path: { benchmarkId, taskId }, query: { runs }, header: languageHeader(locale) },
    })),
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

/** Runs' whole trajectories, every step at once, in the order given; a trajectory is a record, the same in every language. */
export function useConsoleTrajectories(runIds: string[]) {
  return useSuspenseQueries({
    queries: runIds.map(runId => ({
      queryKey: [CONSOLE_QUERY, 'trajectory', runId],
      queryFn: () => responseBody(api.GET('/console/runs/{runId}/trajectory', { params: { path: { runId } } })),
    })),
  }).map(query => query.data);
}

/** One page of a run's trajectory as the console reads it. */
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

/** What a hunt's trial list asks for: a facet or all, a verdict or all, and the page. */
export interface HuntTrialQuery {
  facet: string;
  verdict?: HuntVerdict;
  offset: number;
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
    queryKey: [CONSOLE_QUERY, 'workbench', locale],
    queryFn: () => responseBody(api.GET('/console/workbench', { params: { header: languageHeader(locale) } })),
  }).data;
}

/** What the changelog asks for: one benchmark or all, one kind of change or all, and the page. */
export interface ChangelogQuery {
  benchmarkId: string;
  change?: RevisionChange;
  offset: number;
}

/** Task versions are records, the same in every language. */
export function useChangelog(query: ChangelogQuery, pageSize: number) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'changelog', query, pageSize],
    queryFn: () => responseBody(api.GET('/console/changelog', { params: { query: { benchmarkId: query.benchmarkId, change: query.change, offset: query.offset, limit: pageSize } } })),
  }).data;
}

export function useReleaseOverview() {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'releases'],
    queryFn: () => responseBody(api.GET('/console/releases')),
  }).data;
}

export function useBenchmarkReleases(benchmarkId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'releases', benchmarkId],
    queryFn: () => responseBody(api.GET('/console/benchmarks/{benchmarkId}/releases', { params: { path: { benchmarkId } } })),
  }).data;
}

export function useRelease(releaseId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'release', releaseId],
    queryFn: () => responseBody(api.GET('/console/releases/{releaseId}', { params: { path: { releaseId } } })),
  }).data;
}

/**
 * After a release changes, everything that shows releases is read again, and so is every public page, which shows the
 * current releases.
 */
export function refreshAfterRelease(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ predicate: query => query.queryKey[0] !== CONSOLE_QUERY || ['releases', 'release', 'workbench'].includes(String(query.queryKey[1])) });
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
      queryClient.removeQueries({ queryKey: [CONSOLE_QUERY, 'release', releaseId], exact: true });
      refreshAfterRelease(queryClient);
    },
  });
}

/** The report drafts that name a benchmark, newest first. */
export function useReportDrafts(benchmarkId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'reports', benchmarkId],
    queryFn: () => responseBody(api.GET('/console/reports', { params: { query: { benchmarkId } } })),
  }).data;
}

export function useReportDraft(reportId: string) {
  return useSuspenseQuery({
    queryKey: [CONSOLE_QUERY, 'report', reportId],
    queryFn: () => responseBody(api.GET('/console/reports/{reportId}', { params: { path: { reportId } } })),
  }).data;
}

/** After a draft changes, the lists are read again and the draft's own answer is kept as it is. */
export function refreshAfterReport(queryClient: QueryClient, draft: ReportDraft) {
  queryClient.setQueryData([CONSOLE_QUERY, 'report', draft.id], draft);
  void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, 'reports'] });
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
      queryClient.removeQueries({ queryKey: [CONSOLE_QUERY, 'report', reportId], exact: true });
      void queryClient.invalidateQueries({ queryKey: [CONSOLE_QUERY, 'reports'] });
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
