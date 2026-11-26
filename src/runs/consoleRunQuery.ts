import type { ConsoleRunQuery } from '../api/consoleClient';
import { consoleReviewFilterValues, runOutcomeValues } from '../api/schema';
import type { PendingKind, ReviewFilter, RunOutcome } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { RUN_TABS } from './presentation';

/** Runs per page of the console's run list. */
export const RUN_LIST_PAGE_SIZE = 25;

/** Events per page of a run's event list. */
export const EVENT_PAGE_SIZE = 50;

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunQuery(params: URLSearchParams): ConsoleRunQuery {
  const outcome = params.get('outcome') ?? undefined;
  const review = params.get('review') ?? undefined;
  const offset = Number(params.get('offset') ?? 0);
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
    q: params.get('q') ?? '', model: params.get('model') ?? '', combination: params.get('combination') ?? '', outcome: outcome as RunOutcome | undefined,
    review: review as ReviewFilter | undefined, offset,
  };
}

/** Address parameters for a run list or a run's view, leaving out what is unset; an offset of 0 is the first page and goes unsaid. */
export function runQuerySearch(query: Partial<ConsoleRunQuery> | Partial<ConsoleRunView>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value !== undefined && value !== '' && value !== 0) {
      params.set(name, String(value));
    }
  }
  return params;
}

/** The runs each kind of waiting work concerns, as a filter of the run list. */
export const PENDING_RUNS: Record<PendingKind, Partial<ConsoleRunQuery>> = {
  unreviewedFailures: { review: 'unreviewed' },
  executionFailures: { outcome: 'executionFailed' },
  gradingErrors: { review: 'gradingError' },
};

/** A benchmark's run list, filtered as the query says. */
export function consoleRunsPath(benchmarkId: string, query: Partial<ConsoleRunQuery> = {}): string {
  const search = runQuerySearch(query).toString();
  return `${consoleBenchmarkPath(benchmarkId)}/runs${search ? `?${search}` : ''}`;
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
  const search = runQuerySearch(view).toString();
  return `${consoleBenchmarkPath(benchmarkId)}/runs/${runId}${search ? `?${search}` : ''}`;
}
