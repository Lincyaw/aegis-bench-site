import type { CombinationRuns, RunOutcome } from '../api/client';
import { RUN_TABS, type RunTab } from './presentation';

/** How many tasks the task list shows at first and adds each time the reader asks for more. */
export const TASK_PAGE_SIZE = 14;

/** The outcome filter that shows every run. */
export const EVERY_OUTCOME = 'all';
export const OUTCOME_FILTERS = [EVERY_OUTCOME, 'failed', 'passed'] as const satisfies readonly (typeof EVERY_OUTCOME | RunOutcome)[];
export type OutcomeFilter = (typeof OUTCOME_FILTERS)[number];

/** How the page shows runs: one at a time by its tabs, or side by side for checking how they were graded. */
export const RUN_RECORDS_VIEWS = ['browse', 'compare'] as const;
export type RunRecordsView = (typeof RUN_RECORDS_VIEWS)[number];

/** The most runs the comparison sets side by side. */
export const MAX_COMPARED_RUNS = 3;

/** The state of the run records page, as its address keeps it. */
export interface RunRecordsQuery {
  q: string;

  /** A model and harness pair, as combinationKey writes it */
  combination?: string;

  outcome: OutcomeFilter;
  task?: string;
  run?: string;
  tab?: RunTab;
  step?: number;
  check?: string;
  view: RunRecordsView;

  /** The runs the comparison shows, in the order they were chosen */
  compare: string[];
}

/** The combination filter's choice that shows every combination; a select's choices cannot be empty. */
export const EVERY_COMBINATION = 'all';

export function combinationKey(modelId: string, harnessId: string): string {
  return `${modelId}-${harnessId}`;
}

/** The page's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunRecordsQuery(params: URLSearchParams): RunRecordsQuery {
  const outcome = params.get('outcome') ?? EVERY_OUTCOME;
  const tab = params.get('tab') ?? undefined;
  const step = params.get('step') ?? undefined;
  const view = params.get('view') ?? 'browse';
  const compare = params.get('compare')?.split(',') ?? [];
  if (!OUTCOME_FILTERS.some(filter => filter === outcome)) {
    throw new Error(`no outcome filter ${outcome}`);
  }
  if (!RUN_RECORDS_VIEWS.some(candidate => candidate === view)) {
    throw new Error(`no run records view ${view}`);
  }
  if (compare.length > MAX_COMPARED_RUNS) {
    throw new Error(`the comparison shows at most ${MAX_COMPARED_RUNS} runs`);
  }
  if (tab !== undefined && !RUN_TABS.some(candidate => candidate === tab)) {
    throw new Error(`no run tab ${tab}`);
  }
  if (step !== undefined && !/^[1-9]\d*$/.test(step)) {
    throw new Error(`no step ${step}`);
  }
  return {
    q: params.get('q') ?? '', combination: params.get('combination') ?? undefined, outcome: outcome as OutcomeFilter,
    task: params.get('task') ?? undefined, run: params.get('run') ?? undefined, tab: tab as RunTab | undefined,
    step: step === undefined ? undefined : Number(step), check: params.get('check') ?? undefined,
    view: view as RunRecordsView, compare,
  };
}

/** The address search of a page state; empty values, the default filter and the default view are left out. */
export function runRecordsSearch(query: Partial<RunRecordsQuery>): string {
  const { compare = [], ...rest } = query;
  const entries = Object.entries(rest)
    .filter(([key, value]) => value !== undefined && value !== '' && !(key === 'outcome' && value === EVERY_OUTCOME) && !(key === 'view' && value === 'browse'))
    .map(([key, value]) => [key, String(value)]);
  const search = new URLSearchParams([...entries, ...(compare.length > 0 ? [['compare', compare.join(',')]] : [])]).toString();
  return search && `?${search}`;
}

export function runRecordsPath(benchmarkId: string, query: Partial<RunRecordsQuery> = {}): string {
  return `/benchmarks/${benchmarkId}/runs${runRecordsSearch(query)}`;
}

/** Choosing a task, a run or a filter starts the views below it afresh. */
export function withTask(query: RunRecordsQuery, task: string | undefined): RunRecordsQuery {
  return { ...query, task, run: undefined, tab: undefined, step: undefined, check: undefined, compare: [] };
}

/** Turns to a view, carrying the run in view over: browsing opens the first run compared, comparing starts from the run browsed. */
export function withRunsView(query: RunRecordsQuery, view: RunRecordsView): RunRecordsQuery {
  return view === 'compare'
    ? { ...query, view, compare: query.compare.length > 0 ? query.compare : query.run ? [query.run] : [] }
    : { ...withRun(query, query.compare[0] ?? query.run), view };
}

/** Adds a run to the comparison, or takes it out when it is already there. */
export function withComparedRun(query: RunRecordsQuery, run: string): RunRecordsQuery {
  return { ...query, compare: query.compare.includes(run) ? query.compare.filter(id => id !== run) : [...query.compare, run] };
}

export function withRun(query: RunRecordsQuery, run: string | undefined): RunRecordsQuery {
  return { ...query, run, tab: undefined, step: undefined, check: undefined };
}

export function withSearch(query: RunRecordsQuery, q: string): RunRecordsQuery {
  return { ...withTask(query, undefined), q };
}

export function withFilter(query: RunRecordsQuery, filter: Pick<RunRecordsQuery, 'combination' | 'outcome'>): RunRecordsQuery {
  return { ...withRun(query, undefined), ...filter };
}

/** The detail's view: its tab and, within it, the step or check it opens. */
export function withView(query: RunRecordsQuery, view: { tab: RunTab; step?: number; check?: string }): RunRecordsQuery {
  return { ...query, tab: view.tab, step: view.step, check: view.check };
}

/** A wide window shows the three panes together; a narrow one shows one level at a time. */
export type RunRecordsLevel = 'threePanes' | 'tasks' | 'runs' | 'detail';

export function runRecordsLevel(query: RunRecordsQuery, narrow: boolean): RunRecordsLevel {
  return !narrow ? 'threePanes' : query.run ? 'detail' : query.task ? 'runs' : 'tasks';
}

/** The run a task opens on: the first run of the shown combinations with the filtered outcome (failed by default), else the first. */
export function defaultRunId(combinations: CombinationRuns[], outcome: OutcomeFilter): string | undefined {
  const wanted: RunOutcome = outcome === 'passed' ? 'passed' : 'failed';
  const runs = combinations.flatMap(combination => combination.runs);
  return (runs.find(run => run.outcome === wanted) ?? runs[0])?.id;
}
