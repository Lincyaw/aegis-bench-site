import { consoleReviewFilterValues, consoleRunEventKindValues, runOutcomeValues } from '../api/schema';
import type { ConsoleRunQuery, PendingWork, RunEventQuery } from '../api/types';
import { parseChoice, parseOffset, parseStep, pathWithSearch, searchOf, type AddressTable } from './address';
import { benchmarkSectionPath, parseCombinationScope } from './console';
import { RUN_TABS, type RunView } from './runRecords';

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
  return {
    q: params.get('q') ?? RUN_QUERY_PARAMS.q, task: params.get('task') ?? undefined, ...parseCombinationScope(params), outcome: parseChoice(params, 'outcome', runOutcomeValues),
    review: parseChoice(params, 'review', consoleReviewFilterValues), offset: parseOffset(params, RUN_LIST_PAGE_SIZE),
  };
}

/** Whether a run list keeps to a search, a task, some combinations or a filter rather than listing every run. */
export function isFilteredRunQuery(query: ConsoleRunQuery): boolean {
  return Boolean(query.q || query.task || query.model || query.outcome || query.review);
}

/** A benchmark's run list, filtered as the query says. */
export function consoleRunsPath(benchmarkId: string, query: Partial<ConsoleRunQuery> = {}): string {
  return pathWithSearch(benchmarkSectionPath(benchmarkId, 'runs'), searchOf(RUN_QUERY_PARAMS, query));
}

/** The run list of the runs a kind of waiting work concerns, filtered as the work says. */
export function pendingRunsPath(benchmarkId: string, work: PendingWork): string {
  return consoleRunsPath(benchmarkId, { outcome: work.outcome, review: work.review });
}

/**
 * A run's console page has the public run's five views and three of its own: the trajectory's raw events, what the run
 * consumed, and what the trajectory analyses found in it.
 */
export const CONSOLE_RUN_TABS = [...RUN_TABS, 'events', 'usage', 'hunts'] as const;
export type ConsoleRunTab = (typeof CONSOLE_RUN_TABS)[number];

/**
 * A run's page in its address: the tab with the step or check it opens, the raw events' filter and page, which the
 * events tab keeps while the reader looks at another tab, and the hunt the behaviour review keeps to.
 */
export interface ConsoleRunView extends Omit<RunView, 'tab'>, RunEventQuery {
  tab: ConsoleRunTab;

  /** The hunt whose findings the behaviour review shows; every hunt's when absent */
  hunt?: string;
}

/** Every parameter a run's page keeps in its address; the tab a run opens on is the run's own, so the address always names it. */
export const RUN_VIEW_PARAMS: AddressTable<Partial<ConsoleRunView>> = { tab: undefined, step: undefined, check: undefined, kind: undefined, q: '', offset: 0, hunt: undefined };

export function parseConsoleRunView(params: URLSearchParams, defaultTab: ConsoleRunTab): ConsoleRunView {
  return {
    tab: parseChoice(params, 'tab', CONSOLE_RUN_TABS) ?? defaultTab, step: parseStep(params), check: params.get('check') ?? undefined,
    kind: parseChoice(params, 'kind', consoleRunEventKindValues), q: params.get('q') ?? '', offset: parseOffset(params, EVENT_PAGE_SIZE),
    hunt: params.get('hunt') ?? undefined,
  };
}

export function consoleRunPath(benchmarkId: string, runId: string, view: Partial<ConsoleRunView> = {}): string {
  return pathWithSearch(`${benchmarkSectionPath(benchmarkId, 'runs')}/${runId}`, searchOf(RUN_VIEW_PARAMS, view));
}
