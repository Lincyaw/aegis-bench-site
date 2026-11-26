import type { RunDetail, RunOutcome, RunRef } from '../api/types';
import { COMPARISON_PARAMS, parseComparisonView, setComparisonParams, type ComparisonView } from './comparison';

/** The five views of a run, in the order its tabs show them; each is labelled by runs.tab.<view>. */
export const RUN_TABS = ['input', 'output', 'grading', 'failure', 'trajectory'] as const;
export type RunTab = (typeof RUN_TABS)[number];

/** A failed run opens on why it failed, an execution failure on its trajectory, a passed run on what it produced. */
export function defaultRunTab(run: RunDetail): RunTab {
  switch (run.outcome) {
    case 'failed': return 'failure';
    case 'executionFailed': return 'trajectory';
    case 'passed': return 'output';
  }
}

/** Trajectory steps the list shows at a time. */
export const TRAJECTORY_PAGE_SIZE = 25;

/**
 * Where the page holding a step starts. ATIF numbers a trajectory's steps from 1 without gaps, so a step's id gives
 * its position.
 */
export function trajectoryPageStartOf(stepId: number): number {
  return Math.floor((stepId - 1) / TRAJECTORY_PAGE_SIZE) * TRAJECTORY_PAGE_SIZE;
}

/** How many tasks a task list shows at first and adds each time the reader asks for more. */
export const TASK_PAGE_SIZE = 14;

/** The outcome filter that shows every run. */
export const EVERY_OUTCOME = 'all';
export const OUTCOME_FILTERS = [EVERY_OUTCOME, 'failed', 'passed'] as const satisfies readonly (typeof EVERY_OUTCOME | RunOutcome)[];
export type OutcomeFilter = (typeof OUTCOME_FILTERS)[number];

/** The page's two ways in: by task, each task's runs by combination; or by model, a combination's runs by task. */
export const RUN_RECORD_VIEWS = ['task', 'model'] as const;
export type RunRecordsView = (typeof RUN_RECORD_VIEWS)[number];

/** What the task view shows of the chosen task: its runs, or some of them compared side by side. */
export const TASK_MODES = ['runs', 'compare'] as const;
export type TaskMode = (typeof TASK_MODES)[number];

/** The state of the run records page, as its address keeps it. */
export interface RunRecordsQuery extends ComparisonView {
  by: RunRecordsView;
  q: string;

  /** A model and harness pair, as combinationKey writes it: the task view's filter, the model view's choice */
  combination?: string;

  outcome: OutcomeFilter;

  /** The task view's chosen task; in the model view, the task of the chosen run */
  task?: string;

  mode: TaskMode;
  run?: string;
  tab?: RunTab;
  step?: number;
  check?: string;
}

/** The values the address leaves out. */
export const RUN_RECORDS_DEFAULTS = { by: 'task', outcome: EVERY_OUTCOME, mode: 'runs' } as const satisfies Partial<RunRecordsQuery>;

/** The combination filter's choice that shows every combination; a select's choices cannot be empty. */
export const EVERY_COMBINATION = 'all';

export function combinationKey(modelId: string, harnessId: string): string {
  return `${modelId}-${harnessId}`;
}

/** The page's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunRecordsQuery(params: URLSearchParams): RunRecordsQuery {
  const by = params.get('by') ?? RUN_RECORDS_DEFAULTS.by;
  const outcome = params.get('outcome') ?? RUN_RECORDS_DEFAULTS.outcome;
  const mode = params.get('mode') ?? RUN_RECORDS_DEFAULTS.mode;
  const tab = params.get('tab') ?? undefined;
  const step = params.get('step') ?? undefined;
  if (!RUN_RECORD_VIEWS.some(view => view === by)) {
    throw new Error(`no run records view ${by}`);
  }
  if (!OUTCOME_FILTERS.some(filter => filter === outcome)) {
    throw new Error(`no outcome filter ${outcome}`);
  }
  if (!TASK_MODES.some(candidate => candidate === mode)) {
    throw new Error(`no task mode ${mode}`);
  }
  if (tab !== undefined && !RUN_TABS.some(candidate => candidate === tab)) {
    throw new Error(`no run tab ${tab}`);
  }
  if (step !== undefined && !/^[1-9]\d*$/.test(step)) {
    throw new Error(`no step ${step}`);
  }
  return {
    by: by as RunRecordsView, q: params.get('q') ?? '', combination: params.get('combination') ?? undefined, outcome: outcome as OutcomeFilter,
    task: params.get('task') ?? undefined, mode: mode as TaskMode, run: params.get('run') ?? undefined, tab: tab as RunTab | undefined,
    step: step === undefined ? undefined : Number(step), check: params.get('check') ?? undefined, ...parseComparisonView(params),
  };
}

/** The address search of a page state; empty values and defaults are left out. */
export function runRecordsSearch(query: Partial<RunRecordsQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const isDefault = key in RUN_RECORDS_DEFAULTS && RUN_RECORDS_DEFAULTS[key as keyof typeof RUN_RECORDS_DEFAULTS] === value;
    if (value !== undefined && value !== '' && !isDefault && !COMPARISON_PARAMS.some(name => name === key)) {
      params.set(key, String(value));
    }
  }
  setComparisonParams(params, query);
  const search = params.toString();
  return search && `?${search}`;
}

export function runRecordsPath(benchmarkId: string, query: Partial<RunRecordsQuery> = {}): string {
  return `/benchmarks/${benchmarkId}/runs${runRecordsSearch(query)}`;
}

/** Switching the view keeps the task, combination and run in focus, and leaves the comparison. */
export function withRecordsView(query: RunRecordsQuery, by: RunRecordsView): RunRecordsQuery {
  return { ...query, by, mode: 'runs', runs: [], expand: [], trajectory: [], labels: [] };
}

/** Choosing a task, a run or a filter starts the views below it afresh; a comparison belongs to its task. */
export function withTask(query: RunRecordsQuery, task: string | undefined): RunRecordsQuery {
  return { ...query, task, run: undefined, tab: undefined, step: undefined, check: undefined, runs: [], expand: [], trajectory: [], labels: [] };
}

export function withRun(query: RunRecordsQuery, run: string | undefined): RunRecordsQuery {
  return { ...query, run, tab: undefined, step: undefined, check: undefined };
}

/** The model view's choice of combination, which starts its tasks afresh. */
export function withCombination(query: RunRecordsQuery, combination: string | undefined): RunRecordsQuery {
  return { ...withTask(query, undefined), combination };
}

export function withSearch(query: RunRecordsQuery, q: string): RunRecordsQuery {
  return { ...withTask(query, undefined), q };
}

export function withFilter(query: RunRecordsQuery, filter: Pick<RunRecordsQuery, 'combination' | 'outcome'>): RunRecordsQuery {
  return { ...withRun(query, undefined), ...filter };
}

/** Comparing the chosen task's runs starts with the run in view, if any. */
export function withMode(query: RunRecordsQuery, mode: TaskMode): RunRecordsQuery {
  const startWith = mode === 'compare' && query.runs.length === 0 && query.run ? [query.run] : [];
  return { ...query, mode, runs: [...query.runs, ...startWith] };
}

/** The detail's tab and, within it, the step or check it opens. */
export function withDetail(query: RunRecordsQuery, view: { tab: RunTab; step?: number; check?: string }): RunRecordsQuery {
  return { ...query, tab: view.tab, step: view.step, check: view.check };
}

/** A wide window shows the three panes together; a narrow one shows one level at a time, from the list of tasks or combinations. */
export type RunRecordsLevel = 'threePanes' | 'list' | 'runs' | 'detail';

export function runRecordsLevel(query: RunRecordsQuery, narrow: boolean): RunRecordsLevel {
  const chosen = query.by === 'task' ? query.task : query.combination;
  return !narrow ? 'threePanes' : query.run && query.mode === 'runs' ? 'detail' : chosen ? 'runs' : 'list';
}

/** The run a list opens on: the first of its runs with the filtered outcome (failed by default), else the first. */
export function defaultRunId(runs: RunRef[], outcome: OutcomeFilter): string | undefined {
  const wanted: RunOutcome = outcome === 'passed' ? 'passed' : 'failed';
  return (runs.find(run => run.outcome === wanted) ?? runs[0])?.id;
}
