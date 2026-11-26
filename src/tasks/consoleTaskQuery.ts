import type { ConsoleTaskQuery } from '../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { TaskOrder, TaskSpread } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';
import { parseComparisonView, setComparisonParams, type ComparisonView } from '../runs/comparison';

/** Tasks per page of the console's task list. */
export const TASK_LIST_PAGE_SIZE = 20;

export const TASK_ORDER_DEFAULT: TaskOrder = 'hardest';

/** The list's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseTaskQuery(params: URLSearchParams): ConsoleTaskQuery {
  const spread = params.get('spread') ?? undefined;
  const order = params.get('order') ?? TASK_ORDER_DEFAULT;
  const offset = Number(params.get('offset') ?? 0);
  if (spread !== undefined && !consoleTaskSpreadValues.includes(spread as TaskSpread)) {
    throw new Error(`no task spread ${spread}`);
  }
  if (!consoleTaskOrderValues.includes(order as TaskOrder)) {
    throw new Error(`no task order ${order}`);
  }
  if (!Number.isInteger(offset) || offset < 0 || offset % TASK_LIST_PAGE_SIZE !== 0) {
    throw new Error(`no page of tasks starts at ${params.get('offset')}`);
  }
  return { q: params.get('q') ?? '', tag: params.get('tag') ?? '', spread: spread as TaskSpread | undefined, order: order as TaskOrder, offset };
}

/** The list's address parameters, leaving out what equals the default. */
export function taskQuerySearch(query: ConsoleTaskQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) {
    params.set('q', query.q);
  }
  if (query.tag) {
    params.set('tag', query.tag);
  }
  if (query.spread) {
    params.set('spread', query.spread);
  }
  if (query.order !== TASK_ORDER_DEFAULT) {
    params.set('order', query.order);
  }
  if (query.offset > 0) {
    params.set('offset', String(query.offset));
  }
  return params;
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

export interface TaskPageView extends ComparisonView {
  tab: TaskTab;
  view: TaskRunView;

  /** The file the files tab opens */
  file?: string;
}

export function parseTaskPageView(params: URLSearchParams): TaskPageView {
  const tab = params.get('tab') ?? 'content';
  const view = params.get('view') ?? 'entrants';
  if (!TASK_TABS.includes(tab as TaskTab)) {
    throw new Error(`a task has no tab ${tab}`);
  }
  if (!TASK_RUN_VIEWS.includes(view as TaskRunView)) {
    throw new Error(`a task's runs have no view ${view}`);
  }
  return { tab: tab as TaskTab, view: view as TaskRunView, file: params.get('file') ?? undefined, ...parseComparisonView(params) };
}

/** A task's console page at one of its parts; the content tab, the combination view and empty lists are the defaults. */
export function consoleTaskPath(benchmarkId: string, taskId: string, view: Partial<TaskPageView> = {}): string {
  const search = taskPageSearch(view).toString();
  return `${consoleTasksPath(benchmarkId)}/${taskId}${search ? `?${search}` : ''}`;
}

/** The address parameters of a view of a task's page, leaving out the defaults. */
export function taskPageSearch(view: Partial<TaskPageView>): URLSearchParams {
  const params = new URLSearchParams();
  if (view.tab && view.tab !== 'content') {
    params.set('tab', view.tab);
  }
  if (view.view && view.view !== 'entrants') {
    params.set('view', view.view);
  }
  if (view.file) {
    params.set('file', view.file);
  }
  setComparisonParams(params, view);
  return params;
}
