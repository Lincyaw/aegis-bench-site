import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { CombinationScope, ConsoleTaskQuery, TaskOrder } from '../api/types';
import { parseChoice, parseOffset, pathWithSearch, searchOf, type AddressTable } from './address';
import { EMPTY_COMPARISON, parseComparisonView, type ComparisonView } from './comparison';
import { benchmarkSectionPath, parseCombinationScope } from './console';

/** Tasks per page of the console's task list. */
export const TASK_LIST_PAGE_SIZE = 20;

export const TASK_ORDER_DEFAULT: TaskOrder = 'hardest';

/** Every parameter the task list keeps in its address, with the value the address leaves unsaid. */
export const TASK_QUERY_PARAMS: AddressTable<ConsoleTaskQuery> = { q: '', tag: undefined, spread: undefined, order: TASK_ORDER_DEFAULT, offset: 0 };

/** How a list of tasks is arranged and which page it shows, where every list of tasks names them the same way. */
export function parseTaskListing(params: URLSearchParams, pageSize: number): Pick<ConsoleTaskQuery, 'spread' | 'order' | 'offset'> {
  return {
    spread: parseChoice(params, 'spread', consoleTaskSpreadValues), order: parseChoice(params, 'order', consoleTaskOrderValues) ?? TASK_ORDER_DEFAULT,
    offset: parseOffset(params, pageSize),
  };
}

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseTaskQuery(params: URLSearchParams): ConsoleTaskQuery {
  return { q: params.get('q') ?? TASK_QUERY_PARAMS.q, tag: params.get('tag') ?? undefined, ...parseTaskListing(params, TASK_LIST_PAGE_SIZE) };
}

export function consoleTasksPath(benchmarkId: string): string {
  return benchmarkSectionPath(benchmarkId, 'tasks');
}

/** The parts of a task's console page, in the order its tabs show them. */
export const TASK_TABS = ['content', 'grading', 'reference', 'runs', 'compare', 'files', 'revisions'] as const;
export type TaskTab = (typeof TASK_TABS)[number];

/** How the runs tab arranges a task's runs. */
export const TASK_RUN_VIEWS = ['entrants', 'checks'] as const;
export type TaskRunView = (typeof TASK_RUN_VIEWS)[number];

/** A task's page: the part it shows, and the combinations it keeps to, as the page the reader came from did. */
export interface TaskPageView extends ComparisonView, CombinationScope {
  tab: TaskTab;
  view: TaskRunView;

  /** The file the files tab opens */
  file?: string;

  /** The version the revisions tab marks */
  version?: string;
}

/** Every parameter a task's page keeps in its address, with the value the address leaves unsaid. */
export const TASK_PAGE_PARAMS: AddressTable<TaskPageView> = {
  tab: 'content', view: 'entrants', file: undefined, version: undefined, model: undefined, harness: undefined, ...EMPTY_COMPARISON,
};

export function parseTaskPageView(params: URLSearchParams): TaskPageView {
  return {
    tab: parseChoice(params, 'tab', TASK_TABS) ?? TASK_PAGE_PARAMS.tab, view: parseChoice(params, 'view', TASK_RUN_VIEWS) ?? TASK_PAGE_PARAMS.view,
    file: params.get('file') ?? undefined, version: params.get('version') ?? undefined, ...parseCombinationScope(params), ...parseComparisonView(params),
  };
}

/** A task's console page at one of its parts; the content tab, the combination view and empty lists are the defaults. */
export function consoleTaskPath(benchmarkId: string, taskId: string, view: Partial<TaskPageView> = {}): string {
  return pathWithSearch(`${consoleTasksPath(benchmarkId)}/${taskId}`, searchOf(TASK_PAGE_PARAMS, view));
}
