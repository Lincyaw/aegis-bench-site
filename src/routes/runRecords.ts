import { generatePath } from 'react-router-dom';
import type { RunDetail, RunOutcome, RunRef } from '../api/types';
import { parseChoice, parseStep, pathWithSearch, searchOf, type AddressTable } from './address';
import { EMPTY_COMPARISON, parseComparisonView, type ComparisonView } from './comparison';
import { SITE_ROUTES } from './site';

/** The five views of a run, in the order its tabs show them; each is labelled by runs.tab.<view>. */
export const RUN_TABS = ['input', 'output', 'grading', 'failure', 'trajectory'] as const;
export type RunTab = (typeof RUN_TABS)[number];

/** Which view of a run is shown: its tab and, within it, the step or check it opens. */
export interface RunView {
  tab: RunTab;
  step?: number;
  check?: string;
}

/** Whether a tab is one of the five views every run has. */
export function isRunTab(tab: string): tab is RunTab {
  return RUN_TABS.some(candidate => candidate === tab);
}

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

/** The outcomes the page keeps its runs to; an execution failure is no model result to look for. */
export const OUTCOME_FILTERS = ['failed', 'passed'] as const satisfies readonly RunOutcome[];
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

  /** A model and harness pair, as combinationKey names it: the task view's filter, the model view's choice */
  combination?: string;

  /** Only the runs with this outcome, and what has any of them; every run when absent */
  outcome?: OutcomeFilter;

  /** The task view's chosen task; in the model view, the task of the chosen run */
  task?: string;

  mode: TaskMode;
  run?: string;
  tab?: RunTab;
  step?: number;
  check?: string;
}

/** Every parameter the page keeps in its address, with the value the address leaves unsaid. */
export const RUN_RECORDS_PARAMS: AddressTable<RunRecordsQuery> = {
  by: 'task', q: '', combination: undefined, outcome: undefined, task: undefined, mode: 'runs', run: undefined, tab: undefined, step: undefined,
  check: undefined, ...EMPTY_COMPARISON,
};

/** The page's state from its address; a value outside its set fails the page rather than showing nothing. */
export function parseRunRecordsQuery(params: URLSearchParams): RunRecordsQuery {
  return {
    by: parseChoice(params, 'by', RUN_RECORD_VIEWS) ?? RUN_RECORDS_PARAMS.by, q: params.get('q') ?? '', combination: params.get('combination') ?? undefined,
    outcome: parseChoice(params, 'outcome', OUTCOME_FILTERS), task: params.get('task') ?? undefined, mode: parseChoice(params, 'mode', TASK_MODES) ?? RUN_RECORDS_PARAMS.mode,
    run: params.get('run') ?? undefined, tab: parseChoice(params, 'tab', RUN_TABS), step: parseStep(params), check: params.get('check') ?? undefined,
    ...parseComparisonView(params),
  };
}

export function runRecordsPath(benchmarkId: string, query: Partial<RunRecordsQuery> = {}): string {
  return pathWithSearch(generatePath(SITE_ROUTES.runRecords, { benchmarkId }), searchOf(RUN_RECORDS_PARAMS, query));
}

/** Switching the view keeps the chosen task, combination and run, and leaves the comparison. */
export function withRecordsView(query: RunRecordsQuery, by: RunRecordsView): RunRecordsQuery {
  return { ...query, by, mode: 'runs', ...EMPTY_COMPARISON };
}

/** Choosing a task, a run or a filter starts the views below it afresh; a comparison belongs to its task. */
export function withTask(query: RunRecordsQuery, task: string | undefined): RunRecordsQuery {
  return { ...query, task, run: undefined, tab: undefined, step: undefined, check: undefined, ...EMPTY_COMPARISON };
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

/**
 * Comparing the chosen task's runs starts with the run in view, if any, whether the reader chose it or the list opened
 * on it; the address keeps it, so going back to the runs shows it again.
 */
export function withMode(query: RunRecordsQuery, mode: TaskMode, runInView: string | undefined): RunRecordsQuery {
  const startWith = mode === 'compare' && query.compared.length === 0 && runInView ? [runInView] : [];
  return { ...query, mode, run: runInView, compared: [...query.compared, ...startWith] };
}

/** The detail's tab and, within it, the step or check it opens. */
export function withDetail(query: RunRecordsQuery, view: RunView): RunRecordsQuery {
  return { ...query, tab: view.tab, step: view.step, check: view.check };
}

/** A wide window shows the three panes together; a narrow one shows one level at a time, from the list of tasks or combinations. */
export type RunRecordsLevel = 'threePanes' | 'list' | 'runs' | 'detail';

export function runRecordsLevel(query: RunRecordsQuery, narrow: boolean): RunRecordsLevel {
  const chosen = query.by === 'task' ? query.task : query.combination;
  return !narrow ? 'threePanes' : query.run && query.mode === 'runs' ? 'detail' : chosen ? 'runs' : 'list';
}

/**
 * The run a list opens on: its first failure, which is what a reader looks into first, else its first run. A list kept
 * to one outcome holds no other, so it opens on its first.
 */
export function defaultRunId(runs: RunRef[]): string | undefined {
  return (runs.find(run => run.outcome === 'failed') ?? runs[0])?.id;
}
