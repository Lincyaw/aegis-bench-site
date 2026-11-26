import { consoleReviewFilterValues, runOutcomeValues } from '../api/schema';
import type { ConsoleRunQuery, PendingKind, ReviewFilter, RunOutcome } from '../api/types';
import { pathWithSearch, searchOf, type AddressTable } from './address';
import { consoleBenchmarkPath, parseCombinationScope } from './console';
import { RUN_TABS } from './runRecords';

/** Runs per page of the console's run list. */
export const RUN_LIST_PAGE_SIZE = 25;

/** Events per page of a run's event list. */
export const EVENT_PAGE_SIZE = 50;

/** Every parameter the run list keeps in its address, with the value the address leaves unsaid. */
export const RUN_QUERY_PARAMS: AddressTable<ConsoleRunQuery> = {
  q: '', task: undefined, model: undefined, harness: undefined, outcome: undefined, review: undefined, offset: 0,
};

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunQuery(params: URLSearchParams): ConsoleRunQuery {
  const outcome = params.get('outcome') ?? undefined;
  const review = params.get('review') ?? undefined;
  const offset = Number(params.get('offset') ?? RUN_QUERY_PARAMS.offset);
  if (outcome !== undefined && !runOutcomeValues.includes(outcome as RunOutcome)) {
    throw new Error(`no run outcome ${outcome}`);
  }
  if (review !== undefined && !consoleReviewFilterValues.includes(review as ReviewFilter)) {
    throw new Error(`no review filter ${review}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % RUN_LIST_PAGE_SIZE !== 0) {
    throw new Error(`no page of runs starts at ${params.get('offset')}`);
  }
  return {
    q: params.get('q') ?? RUN_QUERY_PARAMS.q, task: params.get('task') ?? undefined, ...parseCombinationScope(params), outcome: outcome as RunOutcome | undefined,
    review: review as ReviewFilter | undefined, offset,
  };
}

/** Whether a run list keeps to a search, a task, some combinations or a filter rather than listing every run. */
export function isFilteredRunQuery(query: ConsoleRunQuery): boolean {
  return Boolean(query.q || query.task || query.model || query.outcome || query.review);
}

/** The runs each kind of waiting work concerns, as a filter of the run list. */
export const PENDING_RUNS: Record<PendingKind, Partial<ConsoleRunQuery>> = {
  unreviewedFailures: { review: 'unreviewed' },
  executionFailures: { outcome: 'executionFailed' },
  gradingErrors: { review: 'gradingError' },
};

/** A benchmark's run list, filtered as the query says. */
export function consoleRunsPath(benchmarkId: string, query: Partial<ConsoleRunQuery> = {}): string {
  return pathWithSearch(`${consoleBenchmarkPath(benchmarkId)}/runs`, searchOf(RUN_QUERY_PARAMS, query));
}

/**
 * A run's console page has the public run's five views and three of its own: the trajectory's raw events, what the run
 * consumed, and what the trajectory analyses found in it.
 */
export const CONSOLE_RUN_TABS = [...RUN_TABS, 'events', 'usage', 'hunts'] as const;
export type ConsoleRunTab = (typeof CONSOLE_RUN_TABS)[number];

export interface ConsoleRunView {
  tab: ConsoleRunTab;
  step?: number;
  check?: string;
}

/** Every parameter a run's page keeps in its address; the tab a run opens on is the run's own, so the address always names it. */
export const RUN_VIEW_PARAMS: AddressTable<Partial<ConsoleRunView>> = { tab: undefined, step: undefined, check: undefined };

export function parseConsoleRunView(params: URLSearchParams, defaultTab: ConsoleRunTab): ConsoleRunView {
  const tab = params.get('tab') ?? defaultTab;
  const step = params.get('step') ?? undefined;
  if (!CONSOLE_RUN_TABS.includes(tab as ConsoleRunTab)) {
    throw new Error(`a run has no tab ${tab}`);
  }
  if (step !== undefined && !Number.isInteger(Number(step))) {
    throw new Error(`no step ${step}`);
  }
  return { tab: tab as ConsoleRunTab, step: step === undefined ? undefined : Number(step), check: params.get('check') ?? undefined };
}

export function consoleRunPath(benchmarkId: string, runId: string, view: Partial<ConsoleRunView> = {}): string {
  return pathWithSearch(`${consoleBenchmarkPath(benchmarkId)}/runs/${runId}`, searchOf(RUN_VIEW_PARAMS, view));
}
