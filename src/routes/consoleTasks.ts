import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { CombinationScope, ConsoleTaskQuery, TaskOrder, TaskSpread } from '../api/types';
import { pathWithSearch, searchOf, type AddressTable } from './address';
import { EMPTY_COMPARISON, parseComparisonView, type ComparisonView } from './comparison';
import { consoleBenchmarkPath, parseCombinationScope } from './console';

/** Tasks per page of the console's task list. */
export const TASK_LIST_PAGE_SIZE = 20;

export const TASK_ORDER_DEFAULT: TaskOrder = 'hardest';

/** Every parameter the task list keeps in its address, with the value the address leaves unsaid. */
export const TASK_QUERY_PARAMS: AddressTable<ConsoleTaskQuery> = { q: '', tag: undefined, spread: undefined, order: TASK_ORDER_DEFAULT, offset: 0 };

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseTaskQuery(params: URLSearchParams): ConsoleTaskQuery {
  const spread = params.get('spread') ?? undefined;
  const order = params.get('order') ?? TASK_QUERY_PARAMS.order;
  const offset = Number(params.get('offset') ?? TASK_QUERY_PARAMS.offset);
  if (spread !== undefined && !consoleTaskSpreadValues.includes(spread as TaskSpread)) {
    throw new Error(`no task spread ${spread}`);
  }
  if (!consoleTaskOrderValues.includes(order as TaskOrder)) {
    throw new Error(`no task order ${order}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % TASK_LIST_PAGE_SIZE !== 0) {
    throw new Error(`no page of tasks starts at ${params.get('offset')}`);
  }
  return { q: params.get('q') ?? TASK_QUERY_PARAMS.q, tag: params.get('tag') ?? undefined, spread: spread as TaskSpread | undefined, order: order as TaskOrder, offset };
}

export function consoleTasksPath(benchmarkId: string): string {
  return `${consoleBenchmarkPath(benchmarkId)}/tasks`;
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
  const tab = params.get('tab') ?? TASK_PAGE_PARAMS.tab;
  const view = params.get('view') ?? TASK_PAGE_PARAMS.view;
  if (!TASK_TABS.includes(tab as TaskTab)) {
    throw new Error(`a task has no tab ${tab}`);
  }
  if (!TASK_RUN_VIEWS.includes(view as TaskRunView)) {
    throw new Error(`a task's runs have no view ${view}`);
  }
  return {
    tab: tab as TaskTab, view: view as TaskRunView, file: params.get('file') ?? undefined, version: params.get('version') ?? undefined,
    ...parseCombinationScope(params), ...parseComparisonView(params),
  };
}

/** A task's console page at one of its parts; the content tab, the combination view and empty lists are the defaults. */
export function consoleTaskPath(benchmarkId: string, taskId: string, view: Partial<TaskPageView> = {}): string {
  return pathWithSearch(`${consoleTasksPath(benchmarkId)}/${taskId}`, searchOf(TASK_PAGE_PARAMS, view));
}
