import type { ConsoleTaskQuery } from '../api/consoleClient';
import { consoleTaskOrderValues, consoleTaskSpreadValues } from '../api/schema';
import type { TaskOrder, TaskSpread } from '../api/types';
import { consoleBenchmarkPath } from '../console/consoleMap';

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

/** The most runs a comparison holds, as the spec declares, and the most opened in detail side by side. */
export const MAX_COMPARED_RUNS = 4;
export const MAX_OPENED_RUNS = 2;

/** The runs the compare tab sets side by side, the ones opened in detail, and the labels their trajectories are filtered to. */
export interface TaskComparisonView {
  runs: string[];

  /** Each one of runs */
  open: string[];

  /** Annotation categories; every step shows when empty */
  labels: string[];
}

export interface TaskPageView extends TaskComparisonView {
  tab: TaskTab;
  view: TaskRunView;

  /** The file the files tab opens */
  file?: string;
}

/** The comparison's state: a list in the address is its ids joined by commas. */
export const LIST_SEPARATOR = ',';

export function parseTaskPageView(params: URLSearchParams): TaskPageView {
  const tab = params.get('tab') ?? 'content';
  const view = params.get('view') ?? 'entrants';
  const listOf = (name: keyof TaskComparisonView) => params.get(name)?.split(LIST_SEPARATOR) ?? [];
  const runs = listOf('runs');
  const open = listOf('open');
  if (!TASK_TABS.includes(tab as TaskTab)) {
    throw new Error(`a task has no tab ${tab}`);
  }
  if (!TASK_RUN_VIEWS.includes(view as TaskRunView)) {
    throw new Error(`a task's runs have no view ${view}`);
  }
  if (runs.length > MAX_COMPARED_RUNS || new Set(runs).size < runs.length) {
    throw new Error(`a comparison holds at most ${MAX_COMPARED_RUNS} different runs`);
  }
  if (open.length > MAX_OPENED_RUNS || !open.every(run => runs.includes(run))) {
    throw new Error(`at most ${MAX_OPENED_RUNS} of the compared runs open in detail`);
  }
  return { tab: tab as TaskTab, view: view as TaskRunView, file: params.get('file') ?? undefined, runs, open, labels: listOf('labels') };
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
  for (const name of ['runs', 'open', 'labels'] as const) {
    if (view[name]?.length) {
      params.set(name, view[name].join(LIST_SEPARATOR));
    }
  }
  return params;
}

/** Adds a run to the comparison or takes it out, closing its detail with it. */
export function withComparedRun(view: TaskComparisonView, run: string): TaskComparisonView {
  return view.runs.includes(run)
    ? { ...view, runs: view.runs.filter(id => id !== run), open: view.open.filter(id => id !== run) }
    : { ...view, runs: [...view.runs, run] };
}

/** Opens a compared run's detail or closes it; opening one more than fits closes the earliest opened. */
export function withOpenedRun(view: TaskComparisonView, run: string): TaskComparisonView {
  return { ...view, open: view.open.includes(run) ? view.open.filter(id => id !== run) : [...view.open, run].slice(-MAX_OPENED_RUNS) };
}

/** Shows or stops showing the steps an annotation category labels. */
export function withLabel(view: TaskComparisonView, label: string): TaskComparisonView {
  return { ...view, labels: view.labels.includes(label) ? view.labels.filter(id => id !== label) : [...view.labels, label] };
}
